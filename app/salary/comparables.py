"""Finding the jobs a salary estimate is actually based on.

The pool is loaded once per request (and cached briefly, because the job table
barely moves within a day) and then narrowed in memory. Filtering here rather
than in SQL is a considered choice, explained on `app.db.fetch_salary_pool`:
city has to be parsed out of free text, and skill matching has to go through
`app.common.skills` so that salary, recommendations and resume scoring all
agree on what "the same skill" means.

Every comparable carries its **annual** midpoint. Nothing downstream ever sees
a raw `salary_min` again, because those integers mean different things on
different rows.
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field

from app.common.skills import canonical_skill, skill_overlap
from app.config import settings
from app.db import fetch_salary_benchmarks, fetch_salary_pool
from app.salary.units import (
    annualise,
    bands_overlap,
    canonical_city,
    city_from_location,
    experience_mid,
    normalise_title,
)

logger = logging.getLogger(__name__)

# Share of the target job's skills a comparable must also require.
SKILL_OVERLAP_THRESHOLD = 0.6

# How many of the target's skills feed the per-skill blend. Beyond the first
# few the tail is usually "communication" and "teamwork", which price nothing.
BLEND_TOP_SKILLS = 5


@dataclass
class Comparable:
    """One live job posting, reduced to the fields a salary estimate needs."""

    job_id: str
    title: str
    norm_title: str
    city: str | None
    skills: list[str]
    skill_keys: set[str] = field(default_factory=set)
    experience_min: float | None = None
    experience_max: float | None = None
    annual_mid: float = 0.0


def to_comparable(row: dict) -> Comparable | None:
    """Turn a raw job row into a `Comparable`, or None if it cannot be priced."""
    salary_min = row.get("salary_min")
    salary_max = row.get("salary_max")
    if salary_min is None or salary_max is None:
        return None

    try:
        midpoint = (float(salary_min) + float(salary_max)) / 2
    except (TypeError, ValueError):
        return None
    if midpoint <= 0:
        return None

    annual = annualise(midpoint, row.get("pay_rate"))
    if not annual or annual <= 0:
        return None

    skills = [str(s) for s in (row.get("skills") or []) if str(s).strip()]
    title = str(row.get("title") or "")

    return Comparable(
        job_id=str(row.get("id") or ""),
        title=title,
        norm_title=normalise_title(title),
        city=canonical_city(city_from_location(row.get("location"))),
        skills=skills,
        skill_keys={k for k in (canonical_skill(s) for s in skills) if k},
        experience_min=row.get("experience_min"),
        experience_max=row.get("experience_max"),
        annual_mid=annual,
    )


# ── Pool loading, with a short in-process cache ─────
#
# No new dependency: this mirrors the TTL dict already used by
# `app.chat.context`. Valkey is only wired up for chat sessions, and a salary
# pool is small, cheap to rebuild and identical for every employer.

_pool_cache: tuple[float, list[Comparable]] | None = None
_pool_lock = threading.Lock()


def load_pool(force: bool = False) -> list[Comparable]:
    """All active priced jobs as comparables. Cached for the configured TTL."""
    global _pool_cache

    ttl = settings.salary_cache_ttl_seconds
    now = time.time()

    if not force:
        with _pool_lock:
            if _pool_cache and now - _pool_cache[0] < ttl:
                return _pool_cache[1]

    rows = fetch_salary_pool(settings.salary_pool_size)
    pool = [c for c in (to_comparable(r) for r in rows) if c is not None]

    with _pool_lock:
        _pool_cache = (now, pool)

    logger.info("Salary pool loaded: %d priced active jobs", len(pool))
    return pool


def clear_pool_cache() -> None:
    """Drop the cached pool. Used by tests and after a bulk job import."""
    global _pool_cache
    with _pool_lock:
        _pool_cache = None


# ── Filters ─────────────────────────────────────


def by_title(pool: list[Comparable], norm_title: str) -> list[Comparable]:
    """Comparables whose normalised title matches exactly."""
    if not norm_title:
        return []
    return [c for c in pool if c.norm_title and c.norm_title == norm_title]


def by_city(pool: list[Comparable], city: str | None) -> list[Comparable]:
    """Comparables in the same city.

    A None city means the employer gave no usable location, so there is nothing
    to narrow by and the pool passes through untouched. The caller is
    responsible for labelling that result as nationwide.
    """
    target = canonical_city(city)
    if not target:
        return list(pool)
    return [c for c in pool if c.city == target]


def by_experience(
    pool: list[Comparable], exp_min: float | None, exp_max: float | None
) -> list[Comparable]:
    """Comparables whose experience band overlaps the target's."""
    if exp_min is None and exp_max is None:
        return list(pool)
    return [
        c for c in pool
        if bands_overlap(exp_min, exp_max, c.experience_min, c.experience_max)
    ]


def by_skill_overlap(
    pool: list[Comparable],
    skills: list[str],
    threshold: float = SKILL_OVERLAP_THRESHOLD,
) -> list[Comparable]:
    """Comparables that require at least `threshold` of the target's skills.

    Direction matters: we ask how much of *this* job's skill list a comparable
    also asks for. A ten-skill posting that happens to include our two is not a
    comparable for a two-skill posting, and vice versa is exactly what we want.
    """
    wanted = [s for s in (skills or []) if str(s).strip()]
    if not wanted:
        return []

    keys = {k for k in (canonical_skill(s) for s in wanted) if k}
    if not keys:
        return []

    out: list[Comparable] = []
    for comparable in pool:
        if not comparable.skills:
            continue
        matched, _missing = skill_overlap(wanted, comparable.skills)
        if len(matched) / len(keys) >= threshold:
            out.append(comparable)
    return out


# ── Per-skill blend (ladder step 4) ─────────────


def per_skill_blend(
    pool: list[Comparable], skills: list[str], top_n: int = BLEND_TOP_SKILLS
) -> tuple[list[float], list[Comparable]]:
    """Annual values weighted by how many of the target's skills each job shares.

    For each of the target's top skills we collect every job that also requires
    it. A job that shares three of those skills contributes its annual midpoint
    three times, so the blend leans towards postings that look like this one
    without ever inventing a value that is not a real posting's salary.

    Returns `(values, distinct_jobs)`. `values` feeds the percentile maths;
    `distinct_jobs` is the honest sample size to report.
    """
    wanted = [s for s in (skills or []) if str(s).strip()][:top_n]
    if not wanted:
        return [], []

    values: list[float] = []
    distinct: dict[str, Comparable] = {}

    for skill in wanted:
        key = canonical_skill(skill)
        if not key:
            continue
        for comparable in pool:
            if key in comparable.skill_keys:
                values.append(comparable.annual_mid)
                distinct[comparable.job_id] = comparable

    return values, list(distinct.values())


# ── Benchmark table (ladder step 6) ─────────────


def benchmark_percentiles(
    role_family: str,
    city: str | None,
    exp_min: float | None,
    exp_max: float | None,
) -> tuple[tuple[float, float, float] | None, int, str | None]:
    """Annual p25/p50/p75 from the curated benchmark table.

    Rows whose experience band does not overlap the target's are dropped. If
    several rows survive, their percentiles are averaged — the importer may
    hold one row per source, and silently preferring one source over another
    would be a hidden editorial choice.

    Returns `(percentiles, row_count, source_label)`.
    """
    rows = fetch_salary_benchmarks(role_family, city)
    if not rows:
        return None, 0, None

    usable: list[dict] = []
    for row in rows:
        if not bands_overlap(exp_min, exp_max, row.get("experience_min"), row.get("experience_max")):
            continue
        if row.get("p25") is None or row.get("p50") is None or row.get("p75") is None:
            continue
        usable.append(row)

    if not usable:
        return None, 0, None

    p25 = [annualise(r["p25"], r.get("pay_rate")) for r in usable]
    p50 = [annualise(r["p50"], r.get("pay_rate")) for r in usable]
    p75 = [annualise(r["p75"], r.get("pay_rate")) for r in usable]

    sources = sorted({str(r.get("source") or "").strip() for r in usable if r.get("source")})
    label = ", ".join(sources[:2]) if sources else None

    return (
        (sum(p25) / len(p25), sum(p50) / len(p50), sum(p75) / len(p75)),
        len(usable),
        label,
    )
