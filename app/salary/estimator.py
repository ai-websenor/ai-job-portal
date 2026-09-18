"""Market salary estimation for a job an employer is posting.

The shape of this module follows one rule: **the maths produces every number
and the model only produces sentences.** Qwen-3B cannot be trusted with
arithmetic, and an invented salary shown to an employer as market data is
worse than an honest "not enough data yet". So the model is allowed exactly
two jobs — mapping an unknown title to a role family, and writing the sentence
under the range — and if it is unavailable the employer still gets a real
range with `degraded: true`.

Everything is compared in annual rupees, because `jobs.pay_rate` is mixed
(monthly, daily, weekly, hourly, yearly) and the stored integers are otherwise
not comparable. The answer is converted back to the rate the caller asked for.

**The ladder.** We stop at the first rung that yields at least
`settings.salary_min_sample` comparables:

1. same normalised title, same city, overlapping experience
2. 60% skill overlap, same city, overlapping experience
3. 60% skill overlap, nationwide
4. per-skill blend across the job's top skills
5. LLM role-family mapping, then title matching again for that family
6. the curated `salary_benchmarks` table
7. `insufficient_data` — no number at all

Rungs 1-2 can reach `high` confidence. Nothing below them ever exceeds
`medium`, because a nationwide skill blend is a weaker claim than a local
like-for-like comparison and the response should say so.
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
import threading
import time

from app.config import settings
from app.exceptions import ExternalServiceError
from app.salary import comparables as comp
from app.salary.comparables import Comparable
from app.salary.explain import explain_estimate
from app.salary.role_family import resolve_role_family
from app.salary.units import (
    canonical_city,
    city_from_location,
    deannualise,
    experience_mid,
    normalise_pay_rate,
    normalise_title,
)

logger = logging.getLogger(__name__)

CURRENCY = "INR"

# Experience nudge: how much one year of difference against the comparables'
# midpoint moves the estimate, and the hard cap on the total nudge.
EXPERIENCE_STEP_PER_YEAR = 0.06
EXPERIENCE_CAP = 0.25

# City tiers. A coarse cost-of-living adjustment, not market data, and only
# ever applied when the comparables are nationwide — when they are already
# from the same city the local market is baked into them.
CITY_CAP = 0.20

_METRO_CITIES = {
    "mumbai", "delhi", "bangalore", "gurgaon", "noida", "hyderabad",
    "pune", "chennai",
}
_TIER_ONE_CITIES = {
    "kolkata", "ahmedabad", "jaipur", "chandigarh", "kochi", "coimbatore",
    "indore", "nagpur", "bhubaneswar", "thiruvananthapuram", "visakhapatnam",
    "vadodara", "surat", "lucknow", "mysore", "nashik", "mohali", "bhopal",
}
_CITY_TIER_MULTIPLIER = {"metro": 1.15, "tier_1": 1.0, "tier_2": 0.85}

_COMPARISON_TOLERANCE_PCT = 10

# How far the p25-p75 band may stretch before the sample stops describing one
# role. Above SPREAD_LOW_CONFIDENCE the range is shown but never called
# confident; above SPREAD_REJECT nothing is shown at all.
SPREAD_LOW_CONFIDENCE = 3.0
SPREAD_REJECT = 6.0


# ── Result cache ────────────────────────────────
#
# Keyed on everything that changes the estimate except `current_range`, which
# only affects the comparison line and is computed fresh on every call. The
# same in-process TTL dict idiom as `app.chat.context` — no new dependency,
# and the Valkey client in this service is wired only for chat sessions.

_result_cache: dict[str, tuple[float, dict]] = {}
_cache_lock = threading.Lock()
_CACHE_MAX_ENTRIES = 500


def clear_cache() -> None:
    """Drop cached estimates and the comparable pool. Used by tests."""
    with _cache_lock:
        _result_cache.clear()
    comp.clear_pool_cache()


def _cache_key(
    norm_title: str, skills: list[str], city: str | None,
    exp_min: float | None, exp_max: float | None, rate: str,
) -> str:
    payload = json.dumps(
        {
            "t": norm_title,
            "s": sorted({str(s).strip().lower() for s in (skills or []) if str(s).strip()}),
            "c": city or "",
            "e": [exp_min, exp_max],
            "r": rate,
        },
        sort_keys=True,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _cache_get(key: str) -> dict | None:
    ttl = settings.salary_cache_ttl_seconds
    now = time.time()
    with _cache_lock:
        entry = _result_cache.get(key)
        if entry and now - entry[0] < ttl:
            return json.loads(json.dumps(entry[1]))  # defensive copy
    return None


def _cache_put(key: str, value: dict) -> None:
    now = time.time()
    with _cache_lock:
        if len(_result_cache) >= _CACHE_MAX_ENTRIES:
            _result_cache.pop(next(iter(_result_cache)), None)
        _result_cache[key] = (now, json.loads(json.dumps(value)))


# ── Percentiles ─────────────────────────────────


def percentile(values: list[float], q: float) -> float | None:
    """Linear-interpolated percentile, matching numpy's default method.

    Written out rather than pulled in: numpy is not a dependency of this
    service and a salary estimate is not worth adding one for.
    """
    if not values:
        return None
    ordered = sorted(float(v) for v in values)
    if len(ordered) == 1:
        return ordered[0]

    position = (len(ordered) - 1) * (q / 100.0)
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[int(position)]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


# ── Adjustments ─────────────────────────────────


def _experience_factor(
    target_mid: float | None, sample: list[Comparable]
) -> float:
    """Nudge for asking for more (or less) experience than the comparables.

    Linear in the year difference and capped, because a linear extrapolation
    stops being defensible a long way from the data.
    """
    if target_mid is None:
        return 1.0

    mids = [
        m for m in (experience_mid(c.experience_min, c.experience_max) for c in sample)
        if m is not None
    ]
    if not mids:
        return 1.0

    reference = percentile(mids, 50)
    if reference is None:
        return 1.0

    raw = (target_mid - reference) * EXPERIENCE_STEP_PER_YEAR
    return 1.0 + max(-EXPERIENCE_CAP, min(EXPERIENCE_CAP, raw))


def city_tier(city: str | None) -> str:
    """Coarse tier for a city name. Unknown cities are treated as tier 2."""
    key = canonical_city(city)
    if not key:
        return "tier_1"
    if key in _METRO_CITIES:
        return "metro"
    if key in _TIER_ONE_CITIES:
        return "tier_1"
    return "tier_2"


def _city_factor(city: str | None, sample: list[Comparable], scope: str) -> float:
    """Nudge for the target city against the cities the comparables came from.

    Skipped entirely when the comparables are already same-city: their salaries
    *are* the local market, and adjusting them again would double count.
    """
    if scope == "city" or not city:
        return 1.0

    sample_cities = [c.city for c in sample if c.city]
    if not sample_cities:
        return 1.0

    target = _CITY_TIER_MULTIPLIER[city_tier(city)]
    reference = sum(_CITY_TIER_MULTIPLIER[city_tier(c)] for c in sample_cities) / len(sample_cities)
    if reference <= 0:
        return 1.0

    raw = target / reference
    return max(1.0 - CITY_CAP, min(1.0 + CITY_CAP, raw))


# ── The ladder ──────────────────────────────────


class _Rung:
    """One successful rung of the ladder."""

    def __init__(
        self,
        step: int,
        method: str,
        scope: str,
        role_label: str,
        values: list[float] | None = None,
        sample: list[Comparable] | None = None,
        percentiles: tuple[float, float, float] | None = None,
        sample_size: int | None = None,
        source: str | None = None,
    ):
        self.step = step
        self.method = method
        self.scope = scope
        self.role_label = role_label
        self.values = values or []
        self.sample = sample or []
        self.percentiles = percentiles
        self.sample_size = sample_size if sample_size is not None else len(self.sample)
        self.source = source


def _rung_from_jobs(
    step: int, method: str, scope: str, role_label: str, jobs: list[Comparable]
) -> _Rung:
    return _Rung(
        step=step,
        method=method,
        scope=scope,
        role_label=role_label,
        values=[c.annual_mid for c in jobs],
        sample=jobs,
    )


def _climb(
    pool: list[Comparable],
    title: str,
    norm_title: str,
    skills: list[str],
    city: str | None,
    exp_min: float | None,
    exp_max: float | None,
) -> tuple[_Rung | None, bool, str | None]:
    """Walk the ladder. Returns (rung, llm_failed, role_family)."""
    minimum = settings.salary_min_sample
    scope = "city" if city else "nationwide"
    role_label = title.strip() or "this role"

    # 1 — exact title, same city, overlapping experience.
    if norm_title:
        jobs = comp.by_experience(
            comp.by_city(comp.by_title(pool, norm_title), city), exp_min, exp_max
        )
        if len(jobs) >= minimum:
            return _rung_from_jobs(1, "title_city_exp", scope, role_label, jobs), False, None

    # 2 — skill overlap, same city, overlapping experience.
    skill_matches = comp.by_skill_overlap(pool, skills)
    if skill_matches:
        jobs = comp.by_experience(comp.by_city(skill_matches, city), exp_min, exp_max)
        if len(jobs) >= minimum:
            return _rung_from_jobs(2, "skills_city_exp", scope, role_label, jobs), False, None

        # 3 — same skill overlap, drop the city. Only a distinct rung when a
        # city was actually supplied; otherwise rung 2 already was nationwide.
        if city:
            jobs = comp.by_experience(skill_matches, exp_min, exp_max)
            if len(jobs) >= minimum:
                return (
                    _rung_from_jobs(3, "skills_nationwide", "nationwide", role_label, jobs),
                    False,
                    None,
                )

    # 4 — per-skill blend. Weaker: these jobs share a skill, not a shape.
    values, distinct = comp.per_skill_blend(pool, skills)
    if len(distinct) >= minimum:
        return (
            _Rung(
                step=4,
                method="skill_blend",
                scope="nationwide",
                role_label=role_label,
                values=values,
                sample=distinct,
            ),
            False,
            None,
        )

    # 5 — ask the model what kind of role this is, then match titles again.
    llm_failed = False
    family = None
    try:
        family, _source = resolve_role_family(title)
    except ExternalServiceError:
        logger.info("Role-family lookup unavailable; continuing without it")
        llm_failed = True

    if family:
        family_key = normalise_title(family)
        family_jobs = [
            c for c in pool
            if c.norm_title == family_key or family in c.title.strip().lower()
        ]
        if family_jobs:
            jobs = comp.by_experience(comp.by_city(family_jobs, city), exp_min, exp_max)
            if len(jobs) >= minimum:
                return (
                    _rung_from_jobs(5, "family_city_exp", scope, family.title(), jobs),
                    llm_failed,
                    family,
                )

            jobs = comp.by_experience(family_jobs, exp_min, exp_max)
            if len(jobs) >= minimum:
                return (
                    _rung_from_jobs(5, "family_nationwide", "nationwide", family.title(), jobs),
                    llm_failed,
                    family,
                )

    # 6 — the curated benchmark table, the cold-start safety net.
    lookup_family = family or norm_title
    if lookup_family:
        percentiles, rows, source = comp.benchmark_percentiles(
            lookup_family, city, exp_min, exp_max
        )
        if percentiles:
            return (
                _Rung(
                    step=6,
                    method="benchmark_table",
                    scope="city" if city else "nationwide",
                    role_label=(family or title).title() if family else role_label,
                    percentiles=percentiles,
                    sample_size=rows,
                    source=source,
                ),
                llm_failed,
                family,
            )

    # 7 — nothing we can stand behind.
    return None, llm_failed, family


# ── Confidence, basis, comparison ───────────────


def _confidence(step: int, sample_size: int) -> str:
    """Honest confidence for a rung. Only rungs 1-2 can ever be high."""
    if step == 6:
        # Curated rows, not live comparables — a single attributed row is
        # worth something, two or more is worth a bit more, neither is "high".
        return "medium" if sample_size >= 2 else "low"

    if step <= 2 and sample_size >= settings.salary_high_confidence_sample:
        return "high"
    if sample_size >= settings.salary_min_sample:
        return "medium"
    return "low"


def _years_label(exp_min: float | None, exp_max: float | None) -> str | None:
    def fmt(value: float) -> str:
        number = float(value)
        return str(int(number)) if number.is_integer() else str(number)

    if exp_min is not None and exp_max is not None:
        return f"{fmt(exp_min)}-{fmt(exp_max)} years experience"
    if exp_min is not None:
        return f"{fmt(exp_min)}+ years experience"
    if exp_max is not None:
        return f"Up to {fmt(exp_max)} years experience"
    return None


def _build_basis(
    rung: _Rung,
    skills: list[str],
    city: str | None,
    exp_min: float | None,
    exp_max: float | None,
) -> list[dict]:
    basis: list[dict] = []

    years = _years_label(exp_min, exp_max)
    if years:
        basis.append({"icon": "experience", "label": years})

    # Only claim a role match when one was actually found. The skills rungs
    # carry the employer's own title through unchanged, so "Closest match: ABC
    # Developer" read as though we had priced real ABC Developer postings when
    # in fact the title was never matched against anything.
    if (
        rung.method.startswith("title_")
        or rung.method.startswith("family_")
        or rung.method == "benchmark_table"
    ):
        basis.append({"icon": "role", "label": f"Closest match: {rung.role_label}"})
    else:
        basis.append({"icon": "role", "label": "Priced on skills, not job title"})

    top_skills = [str(s).strip() for s in (skills or []) if str(s).strip()][:3]
    if top_skills:
        basis.append({"icon": "skills", "label": " + ".join(top_skills)})

    if city and rung.scope == "city":
        basis.append({"icon": "location", "label": f"{city.title()} market"})
    else:
        basis.append({"icon": "location", "label": "Nationwide market"})

    if rung.source:
        basis.append({"icon": "role", "label": f"Benchmark source: {rung.source}"})

    return basis


def _build_comparison(current_range: list[int] | None, typical: int) -> dict | None:
    """How the employer's current slider position sits against the estimate."""
    if not current_range or typical <= 0:
        return None

    numbers = [float(v) for v in current_range if isinstance(v, (int, float))]
    if len(numbers) < 2:
        return None

    low, high = min(numbers[:2]), max(numbers[:2])
    midpoint = (low + high) / 2
    delta_pct = int(round((midpoint - typical) / typical * 100))

    if abs(delta_pct) <= _COMPARISON_TOLERANCE_PCT:
        return {
            "status": "within",
            "delta_pct": delta_pct,
            "message": "Your posted range is in line with similar roles.",
        }

    if delta_pct < 0:
        return {
            "status": "below",
            "delta_pct": delta_pct,
            "message": (
                f"Your posted range is about {abs(delta_pct)}% below similar roles "
                f"— you may get fewer applicants."
            ),
        }

    return {
        "status": "above",
        "delta_pct": delta_pct,
        "message": (
            f"Your posted range is about {delta_pct}% above similar roles "
            f"— expect strong interest, but check it against your budget."
        ),
    }


# ── Response builders ───────────────────────────


def _insufficient(pay_rate: str, reason: str, sample_size: int = 0,
                  degraded: bool = False) -> dict:
    """The honest answer. Same key set as a successful estimate."""
    return {
        "status": "insufficient_data",
        "currency": CURRENCY,
        "pay_rate": pay_rate,
        "range": None,
        "typical": None,
        "confidence": "low",
        "sample_size": sample_size,
        "method": "none",
        "clamped": False,
        "basis": [],
        "comparison": None,
        "explanation": None,
        "degraded": degraded,
        "reason": reason,
    }


def _clamp(value: int) -> tuple[int, bool]:
    """Fit a figure inside the employer slider's bounds."""
    low, high = settings.salary_slider_min, settings.salary_slider_max
    if value < low:
        return low, True
    if value > high:
        return high, True
    return value, False


# ── Entry point ─────────────────────────────────


def estimate_salary(
    title: str,
    skills: list[str] | None = None,
    experience_min: float | None = None,
    experience_max: float | None = None,
    location: str | None = None,
    job_type: list[str] | None = None,
    work_mode: list[str] | None = None,
    pay_rate: str | None = None,
    current_range: list[int] | None = None,
) -> dict:
    """Return a market salary estimate for a job posting.

    `job_type` and `work_mode` are accepted for forward compatibility but do
    not narrow the comparables today: with 57 active jobs, filtering on them as
    well reliably produces a sample of zero. They will start mattering once the
    board is an order of magnitude larger.
    """
    rate = normalise_pay_rate(pay_rate)

    if not settings.salary_enabled:
        return _insufficient(rate, "disabled")

    skills = [str(s).strip() for s in (skills or []) if str(s).strip()]
    norm_title = normalise_title(title)
    city = city_from_location(location)

    key = _cache_key(norm_title, skills, city, experience_min, experience_max, rate)
    cached = _cache_get(key)
    if cached is not None:
        cached["comparison"] = (
            _build_comparison(current_range, cached["typical"])
            if cached.get("typical")
            else None
        )
        return cached

    core = _estimate_core(
        title=title,
        norm_title=norm_title,
        skills=skills,
        city=city,
        exp_min=experience_min,
        exp_max=experience_max,
        rate=rate,
    )

    _cache_put(key, core)

    result = json.loads(json.dumps(core))
    result["comparison"] = (
        _build_comparison(current_range, result["typical"]) if result.get("typical") else None
    )
    return result


def _estimate_core(
    title: str,
    norm_title: str,
    skills: list[str],
    city: str | None,
    exp_min: float | None,
    exp_max: float | None,
    rate: str,
) -> dict:
    """Everything that does not depend on the employer's current slider value."""
    started = time.monotonic()

    pool = comp.load_pool()
    if not pool:
        return _insufficient(rate, "no_priced_jobs")

    rung, llm_failed, _family = _climb(
        pool, title, norm_title, skills, city, exp_min, exp_max
    )

    if rung is None:
        return _insufficient(rate, "no_comparables", degraded=llm_failed)

    # Percentiles of the comparables' annual midpoints.
    if rung.percentiles is not None:
        p25, p50, p75 = rung.percentiles
    else:
        p25 = percentile(rung.values, 25)
        p50 = percentile(rung.values, 50)
        p75 = percentile(rung.values, 75)

    if p25 is None or p50 is None or p75 is None:
        return _insufficient(rate, "no_comparables", degraded=llm_failed)

    # Enough comparables is not the same as comparable comparables. Against the
    # live pool, "ABC Developer" in Bangalore currently produces a skill blend
    # of 16 jobs whose p25-p75 runs 17k to 190k a month — an eleven-fold band
    # that contains almost every salary on the portal. Presenting that as an
    # estimate would be worse than presenting nothing, because it looks like an
    # answer. A sample this scattered is describing the market, not the role.
    spread = (p75 / p25) if p25 > 0 else float("inf")
    if spread > SPREAD_REJECT:
        logger.info(
            "Rejecting salary estimate: p75/p25 = %.1f over %d comparables (%s)",
            spread, rung.sample_size, rung.method,
        )
        return _insufficient(
            rate, "inconsistent_comparables",
            sample_size=rung.sample_size, degraded=llm_failed,
        )

    factor = (
        _experience_factor(experience_mid(exp_min, exp_max), rung.sample)
        * _city_factor(city, rung.sample, rung.scope)
    )

    annual = sorted(value * factor for value in (p25, p50, p75))

    range_min = deannualise(annual[0], rate)
    typical = deannualise(annual[1], rate)
    range_max = deannualise(annual[2], rate)

    range_min, low_clamped = _clamp(range_min)
    typical, mid_clamped = _clamp(typical)
    range_max, high_clamped = _clamp(range_max)

    # Rounding and clamping can cross the three over each other; the employer
    # must never see a minimum above the typical.
    range_min, typical, range_max = sorted((range_min, typical, range_max))

    confidence = _confidence(rung.step, rung.sample_size)
    # A band that is merely wide rather than useless still cannot be called
    # high confidence, however many rows produced it.
    if spread > SPREAD_LOW_CONFIDENCE:
        confidence = "low"

    result = {
        "status": "ok",
        "currency": CURRENCY,
        "pay_rate": rate,
        "range": {"min": range_min, "max": range_max},
        "typical": typical,
        "confidence": confidence,
        "sample_size": rung.sample_size,
        "method": rung.method,
        "clamped": bool(low_clamped or mid_clamped or high_clamped),
        "basis": _build_basis(rung, skills, city, exp_min, exp_max),
        "comparison": None,
        "explanation": None,
        "degraded": llm_failed,
    }

    # The sentence is the last thing and the only optional thing. If the model
    # has already eaten the interactive budget looking up a role family, or it
    # is simply down, the employer still gets the range.
    elapsed = time.monotonic() - started
    if elapsed >= settings.salary_llm_timeout_seconds:
        logger.info("Skipping salary explanation: %.1fs already spent", elapsed)
        result["degraded"] = True
        return result

    if llm_failed:
        return result

    try:
        result["explanation"] = explain_estimate(
            role_label=rung.role_label,
            city=city if rung.scope == "city" else None,
            exp_min=exp_min,
            exp_max=exp_max,
            sample_size=rung.sample_size,
            confidence=confidence,
        )
    except ExternalServiceError as e:
        logger.info("Salary explanation unavailable: %s", e)
        result["degraded"] = True

    return result
