"""Unit and text normalisation for salary comparison.

Two columns in `jobs` make naive comparison wrong, and both are handled here.

**`pay_rate` is mixed.** `salary_min`/`salary_max` are plain integers whose
meaning depends on `pay_rate` — monthly for most rows, but also daily, weekly,
hourly and yearly. Averaging 45000 (monthly) with 1200 (daily) produces a
number that means nothing. Everything is therefore converted to an annual
figure before any arithmetic and converted back to the caller's requested rate
at the very end.

**`jobs.city` is never written.** The employer job form has a single free-text
`location` box, so the `city` column is NULL on every row and the real value
looks like "Udaipur, Rajasthan, India, 313001", "Mumbai, India", "Bangalore"
or "udaipur ". `city_from_location` pulls the city back out of that string.
Nothing in this package may filter on `jobs.city`.
"""

from __future__ import annotations

# Working-year multipliers. Deliberately conservative and fixed: they are a
# unit conversion, not a market opinion, so they must never drift.
PAY_RATE_MULTIPLIERS: dict[str, int] = {
    "hourly": 2080,   # 40h x 52 weeks
    "daily": 260,     # 5 days x 52 weeks
    "weekly": 52,
    "monthly": 12,
    "yearly": 1,
}

# A NULL `pay_rate` is read as monthly: that is what the overwhelming majority
# of the populated rows say, and the employer form defaults to it.
DEFAULT_PAY_RATE = "monthly"

# Spellings seen in the wild / likely from the frontend select.
_PAY_RATE_ALIASES: dict[str, str] = {
    "hour": "hourly", "hr": "hourly", "per hour": "hourly", "per_hour": "hourly",
    "hourly": "hourly",
    "day": "daily", "per day": "daily", "per_day": "daily", "daily": "daily",
    "week": "weekly", "per week": "weekly", "per_week": "weekly", "weekly": "weekly",
    "month": "monthly", "per month": "monthly", "per_month": "monthly",
    "monthly": "monthly", "mo": "monthly",
    "year": "yearly", "per year": "yearly", "per_year": "yearly",
    "yearly": "yearly", "annual": "yearly", "annually": "yearly",
    "per annum": "yearly", "pa": "yearly", "ctc": "yearly",
}


def normalise_pay_rate(pay_rate: str | None) -> str:
    """Map whatever arrived to one of the five known rates.

    Unknown or missing values become `DEFAULT_PAY_RATE` rather than raising:
    a salary estimate is advisory, and refusing to answer because an employer
    picked an unexpected label helps nobody.
    """
    key = " ".join(str(pay_rate or "").strip().lower().split())
    return _PAY_RATE_ALIASES.get(key, DEFAULT_PAY_RATE)


def annualise(amount: float | int | None, pay_rate: str | None) -> float | None:
    """Convert a salary figure in `pay_rate` units into a yearly figure."""
    if amount is None:
        return None
    try:
        value = float(amount)
    except (TypeError, ValueError):
        return None
    return value * PAY_RATE_MULTIPLIERS[normalise_pay_rate(pay_rate)]


def deannualise(annual: float | int | None, pay_rate: str | None) -> int | None:
    """Convert a yearly figure back into `pay_rate` units, rounded to an int.

    Round-trips with `annualise` exactly for whole multiples, and to within a
    rupee otherwise — the employer slider steps in thousands, so sub-rupee
    precision is noise.
    """
    if annual is None:
        return None
    try:
        value = float(annual)
    except (TypeError, ValueError):
        return None
    return int(round(value / PAY_RATE_MULTIPLIERS[normalise_pay_rate(pay_rate)]))


# ── Location ────────────────────────────────────

# City spellings that mean the same market. Applied only when matching, never
# when reporting, so the employer still sees the name they typed.
_CITY_ALIASES: dict[str, str] = {
    "bengaluru": "bangalore",
    "bangalore urban": "bangalore",
    "bombay": "mumbai",
    "navi mumbai": "mumbai",
    "thane": "mumbai",
    "new delhi": "delhi",
    "delhi ncr": "delhi",
    "ncr": "delhi",
    "gurugram": "gurgaon",
    "calcutta": "kolkata",
    "madras": "chennai",
    "trivandrum": "thiruvananthapuram",
    "pondicherry": "puducherry",
    "vizag": "visakhapatnam",
}


def city_from_location(location: str | None) -> str | None:
    """Best-effort city from the employer's free-text location string.

    The rule is the first comma-separated token, trimmed and lowercased, which
    covers every shape present in the data: "Udaipur, Rajasthan, India, 313001",
    "Mumbai, India", "Bangalore", "udaipur", "Udaipur " (trailing space).

    Two guards on top of that rule:
    * a leading token that is only digits (a stray pincode) is skipped in
      favour of the next token;
    * "remote"/"work from home" is not a city, so it yields None and the
      estimate falls through to the nationwide step instead of matching the
      handful of rows that happen to say "Remote".
    """
    raw = str(location or "")
    if not raw.strip():
        return None

    # Employers also separate with "-", "|" and "/" — treat those as commas so
    # "Bangalore - Karnataka" does not become the city "bangalore - karnataka".
    for separator in ("|", "/", " - "):
        raw = raw.replace(separator, ",")

    for token in raw.split(","):
        city = " ".join(token.strip().lower().split())
        if not city or city.isdigit():
            continue
        if city in {"remote", "work from home", "wfh", "anywhere", "india"}:
            continue
        return city
    return None


def canonical_city(city: str | None) -> str | None:
    """Collapse alternative spellings so two cities can be compared."""
    if not city:
        return None
    key = " ".join(str(city).strip().lower().split())
    if not key:
        return None
    return _CITY_ALIASES.get(key, key)


# ── Title ───────────────────────────────────────

# Seniority is already handled by the experience band, so carrying it in the
# title only splits "Senior Java Developer" away from "Java Developer" and
# costs us a comparable we should have had. There are 53 distinct titles over
# 57 active jobs; every join we can honestly make matters.
_TITLE_NOISE = {
    "sr", "senior", "jr", "junior", "lead", "principal", "staff", "chief",
    "associate", "assistant", "trainee", "intern", "i", "ii", "iii", "iv",
    "fresher", "experienced", "urgent", "hiring", "immediate", "required",
    "the", "a", "an", "for", "of", "and",
}


def normalise_title(title: str | None) -> str:
    """Reduce a job title to a comparable key.

    Lowercased, punctuation dropped, seniority and recruiter filler removed,
    remaining words sorted so "Developer Full Stack" equals "Full Stack
    Developer". Returns "" when nothing meaningful is left.
    """
    raw = str(title or "").lower()
    cleaned = "".join(ch if ch.isalnum() else " " for ch in raw)
    words = [w for w in cleaned.split() if w and w not in _TITLE_NOISE]
    if not words:
        return ""
    return " ".join(sorted(words))


# ── Experience ──────────────────────────────────


def experience_mid(exp_min: float | None, exp_max: float | None) -> float | None:
    """Midpoint of an experience band, tolerating a half-filled one."""
    values = [float(v) for v in (exp_min, exp_max) if v is not None]
    if not values:
        return None
    return sum(values) / len(values)


def bands_overlap(
    a_min: float | None, a_max: float | None,
    b_min: float | None, b_max: float | None,
) -> bool:
    """True when two experience bands share any years.

    An open end is treated as unbounded, and a band that is entirely missing
    matches everything — roughly a third of rows leave experience blank, and
    excluding them would throw away comparables we do have salaries for.
    """
    if a_min is None and a_max is None:
        return True
    if b_min is None and b_max is None:
        return True

    lo_a = float(a_min) if a_min is not None else float("-inf")
    hi_a = float(a_max) if a_max is not None else float("inf")
    lo_b = float(b_min) if b_min is not None else float("-inf")
    hi_b = float(b_max) if b_max is not None else float("inf")

    return lo_a <= hi_b and lo_b <= hi_a
