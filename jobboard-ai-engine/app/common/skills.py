"""Skill spelling normalisation, shared by every feature that compares skills.

Employers type job skills by hand, so the stored spelling rarely equals the
candidate's: "React" vs "ReactJS" vs "react.js" vs "React JS". Recommendations,
salary comparables and resume scoring all break silently on that mismatch —
each one would find nothing and report an honest-looking zero.

This module was lifted out of `app/recommendations/engine.py` unchanged so all
three share one definition of "the same skill".
"""

# Suffixes employers add to the same technology. "React" is stored as "ReactJS",
# "React.js", "React JS" — all of which miss a plain `&&` overlap on "React".
SKILL_SUFFIXES = ("js", ".js", " js", "js developer", " development")


def expand_skill_variants(skills: list[str]) -> list[str]:
    """Expand each skill into the spellings employers commonly type.

    Expansion happens here rather than in SQL so the query keeps using the
    cheap `&&` array-overlap operator instead of normalizing every job row.
    """
    out: list[str] = []
    seen: set[str] = set()

    def add(value: str):
        # Exact dedupe only: the DB compares with `&&`, which is case-sensitive,
        # so "react" and "React" are both worth sending.
        value = value.strip()
        if value and value not in seen:
            seen.add(value)
            out.append(value)

    for skill in skills or []:
        raw = str(skill).strip()
        if not raw:
            continue

        add(raw)
        add(raw.lower())
        add(raw.title())

        # Strip a trailing variant suffix so "ReactJS" also matches "React"
        low = raw.lower()
        base = raw
        for suffix in SKILL_SUFFIXES:
            if low.endswith(suffix) and len(low) > len(suffix) + 1:
                base = raw[: -len(suffix)].strip(" .-")
                add(base)
                add(base.lower())
                break

        # ...and add the suffixed spellings of the base form. Only for single
        # alphabetic tokens — "Machine LearningJS" and "C++JS" are noise that
        # would never match anything.
        if len(base) >= 3 and base.isalpha():
            for suffix in ("JS", "js", ".js", " JS"):
                add(f"{base}{suffix}")
                add(f"{base.lower()}{suffix.lower()}")

        # Punctuation variants: "Node.js" <-> "Nodejs", "C++"/"CPP" stay as-is
        if "." in raw:
            add(raw.replace(".", ""))
        if " " in raw:
            add(raw.replace(" ", ""))
            add(raw.replace(" ", "-"))
        if "-" in raw:
            add(raw.replace("-", " "))
            add(raw.replace("-", ""))

    # Guard the query size — a huge ANY() array is its own performance problem.
    return out[:200]


def canonical_skill(skill: str) -> str:
    """Reduce a skill to one comparable key.

    `expand_skill_variants` widens a list for a SQL `&&` overlap. This does the
    opposite: it collapses a spelling to a single token so two lists can be
    compared in Python without counting "React" and "ReactJS" as two skills.
    """
    raw = str(skill or "").strip().lower()
    if not raw:
        return ""

    for suffix in SKILL_SUFFIXES:
        if raw.endswith(suffix) and len(raw) > len(suffix) + 1:
            raw = raw[: -len(suffix)].strip(" .-")
            break

    # Punctuation and spacing carry no meaning here: "node.js", "node js" and
    # "nodejs" are one skill. "c++" keeps its plus signs — dropping them would
    # collapse it into "c".
    for ch in (".", " ", "-", "_", "/"):
        raw = raw.replace(ch, "")

    return raw


def skill_overlap(required: list[str], owned: list[str]) -> tuple[list[str], list[str]]:
    """Split `required` into (matched, missing) against `owned`.

    Comparison is on canonical form, but the returned strings keep the original
    spelling from `required` — a candidate should be told to add "Node.js", not
    "nodejs".
    """
    owned_keys = {canonical_skill(s) for s in owned or []}
    owned_keys.discard("")

    matched: list[str] = []
    missing: list[str] = []
    seen: set[str] = set()

    for skill in required or []:
        key = canonical_skill(skill)
        if not key or key in seen:
            continue
        seen.add(key)
        (matched if key in owned_keys else missing).append(str(skill).strip())

    return matched, missing
