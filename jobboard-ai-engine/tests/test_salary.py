"""Salary estimation tests.

Everything here runs against a fake job pool and a fake model, so the suite is
fully deterministic and needs neither the database nor the GPU box. The point
of these tests is not that the numbers are "right" — a market estimate has no
ground truth — but that every number shown is one the comparables can support,
that each rung of the ladder is reached under the conditions it is meant for,
and that the model going down costs the employer a sentence rather than the
whole answer.

Run with: pytest tests/test_salary.py -q
"""

from __future__ import annotations

import pytest

from app.config import settings
from app.exceptions import ExternalServiceError
from app.salary import comparables as comp
from app.salary import estimator as est
from app.salary import explain as explain_mod
from app.salary import role_family as rf
from app.salary.estimator import estimate_salary
from app.salary.units import (
    PAY_RATE_MULTIPLIERS,
    annualise,
    bands_overlap,
    canonical_city,
    city_from_location,
    deannualise,
    normalise_pay_rate,
    normalise_title,
)

CANNED_SENTENCE = "This is a market estimate drawn from similar live job adverts."


# ── Fixtures ────────────────────────────────────


def job_row(
    index: int = 0,
    title: str = "Backend Developer",
    skills: list[str] | None = None,
    location: str = "Bangalore, Karnataka, India",
    experience_min: int | None = 2,
    experience_max: int | None = 5,
    salary_min: int = 60000,
    salary_max: int = 80000,
    pay_rate: str | None = "monthly",
) -> dict:
    """One row shaped exactly like `app.db.fetch_salary_pool` returns."""
    return {
        "id": f"job-{index}",
        "title": title,
        "skills": skills if skills is not None else ["Python", "Django", "PostgreSQL"],
        "location": location,
        "state": "Karnataka",
        "experience_min": experience_min,
        "experience_max": experience_max,
        "salary_min": salary_min,
        "salary_max": salary_max,
        "pay_rate": pay_rate,
        "job_type": ["full_time"],
        "work_mode": ["onsite"],
    }


def rows(count: int, **kwargs) -> list[dict]:
    return [job_row(index=i, **kwargs) for i in range(count)]


@pytest.fixture(autouse=True)
def isolate(monkeypatch):
    """No database, no model, no cache carried between tests."""
    est.clear_cache()

    monkeypatch.setattr(comp, "fetch_salary_pool", lambda limit=400: [])
    monkeypatch.setattr(comp, "fetch_salary_benchmarks", lambda family, city=None: [])
    monkeypatch.setattr(explain_mod, "invoke_llm", lambda *a, **k: CANNED_SENTENCE)
    monkeypatch.setattr(rf, "invoke_llm", lambda *a, **k: "none")

    yield

    est.clear_cache()


@pytest.fixture
def pool(monkeypatch):
    """Install a job pool for the test. Returns the setter."""

    def install(job_rows: list[dict]):
        monkeypatch.setattr(comp, "fetch_salary_pool", lambda limit=400: list(job_rows))
        est.clear_cache()

    return install


# ── Unit conversion ─────────────────────────────


def test_annualise_uses_the_documented_multipliers():
    assert annualise(100, "hourly") == 100 * 2080
    assert annualise(1000, "daily") == 1000 * 260
    assert annualise(5000, "weekly") == 5000 * 52
    assert annualise(50000, "monthly") == 50000 * 12
    assert annualise(900000, "yearly") == 900000


@pytest.mark.parametrize("rate", sorted(PAY_RATE_MULTIPLIERS))
@pytest.mark.parametrize("amount", [2000, 45000, 197000])
def test_unit_conversion_round_trips(rate, amount):
    assert deannualise(annualise(amount, rate), rate) == amount


def test_null_pay_rate_is_treated_as_monthly():
    assert normalise_pay_rate(None) == "monthly"
    assert normalise_pay_rate("") == "monthly"
    assert normalise_pay_rate("something odd") == "monthly"
    assert annualise(1000, None) == annualise(1000, "monthly")


def test_pay_rate_aliases_are_understood():
    assert normalise_pay_rate("Per Month") == "monthly"
    assert normalise_pay_rate("ANNUAL") == "yearly"
    assert normalise_pay_rate("per_hour") == "hourly"


def test_annualise_and_deannualise_tolerate_nonsense():
    assert annualise(None, "monthly") is None
    assert annualise("not a number", "monthly") is None
    assert deannualise(None, "monthly") is None


# ── Location parsing ────────────────────────────


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("Udaipur, Rajasthan, Indian, 313001", "udaipur"),
        ("Mumbai, India", "mumbai"),
        ("Bangalore", "bangalore"),
        ("udaipur", "udaipur"),
        ("Udaipur ", "udaipur"),
        ("  Udaipur  ,  Rajasthan ", "udaipur"),
        ("New Delhi, India", "new delhi"),
        ("313001, Udaipur", "udaipur"),
        ("Bangalore - Karnataka", "bangalore"),
        ("Pune | Maharashtra", "pune"),
        ("Remote", None),
        ("India", None),
        ("", None),
        ("   ", None),
        (None, None),
    ],
)
def test_city_from_location_handles_the_real_formats(raw, expected):
    assert city_from_location(raw) == expected


def test_city_aliases_collapse_to_one_market():
    assert canonical_city("Bengaluru") == "bangalore"
    assert canonical_city("New Delhi") == "delhi"
    assert canonical_city("Gurugram") == "gurgaon"
    assert canonical_city(city_from_location("Bengaluru, Karnataka")) == "bangalore"


# ── Title normalisation ─────────────────────────


def test_normalise_title_ignores_seniority_and_word_order():
    assert normalise_title("Senior Full Stack Developer") == normalise_title(
        "Full Stack Developer"
    )
    assert normalise_title("Developer, Full Stack") == normalise_title(
        "Full Stack Developer"
    )
    assert normalise_title("  BACKEND   developer ") == normalise_title("Backend Developer")
    assert normalise_title("Senior") == ""
    assert normalise_title(None) == ""


def test_experience_bands_overlap():
    assert bands_overlap(3, 6, 5, 8)
    assert not bands_overlap(3, 6, 7, 9)
    assert bands_overlap(3, 6, None, None)  # missing band matches everything
    assert bands_overlap(None, None, 7, 9)


# ── Ladder step 1: title + city + experience ────


def test_step_1_title_city_experience(pool):
    pool(rows(12, title="Backend Developer", salary_min=60000, salary_max=80000))

    result = estimate_salary(
        title="Backend Developer",
        skills=["Python"],
        experience_min=2,
        experience_max=5,
        location="Bangalore, Karnataka",
        pay_rate="monthly",
    )

    assert result["status"] == "ok"
    assert result["method"] == "title_city_exp"
    assert result["sample_size"] == 12
    assert result["confidence"] == "medium"
    assert result["currency"] == "INR"
    assert result["pay_rate"] == "monthly"
    # Every row is 60k-80k monthly, so the only defensible answer is 70k.
    assert result["typical"] == 70000
    assert result["range"] == {"min": 70000, "max": 70000}
    assert result["clamped"] is False
    assert result["degraded"] is False
    assert result["explanation"] == CANNED_SENTENCE


def test_step_1_reaches_high_confidence_with_a_big_sample(pool):
    pool(rows(settings.salary_high_confidence_sample + 2, title="Backend Developer"))

    result = estimate_salary(
        title="Backend Developer",
        skills=["Python"],
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="monthly",
    )

    assert result["confidence"] == "high"
    assert result["method"] == "title_city_exp"


def test_percentiles_come_from_the_comparables(pool):
    # Five distinct monthly midpoints: 30k, 40k, 50k, 60k, 70k (x2 to clear
    # the minimum sample) — p25/p50/p75 must land on real postings.
    midpoints = [30000, 40000, 50000, 60000, 70000] * 2
    pool([
        job_row(index=i, title="Backend Developer", salary_min=mid, salary_max=mid)
        for i, mid in enumerate(midpoints)
    ])

    result = estimate_salary(
        title="Backend Developer",
        skills=["Python"],
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="monthly",
    )

    assert result["status"] == "ok"
    assert result["typical"] == 50000
    assert result["range"]["min"] == 40000
    assert result["range"]["max"] == 60000
    assert result["range"]["min"] <= result["typical"] <= result["range"]["max"]


def test_mixed_pay_rates_are_normalised_before_comparison(pool):
    # The same annual money (600,000) expressed four different ways. If the
    # rows were compared as stored the answer would be nonsense.
    pool([
        job_row(index=0, salary_min=50000, salary_max=50000, pay_rate="monthly"),
        job_row(index=1, salary_min=600000, salary_max=600000, pay_rate="yearly"),
        job_row(index=2, salary_min=600000 // 260, salary_max=600000 // 260, pay_rate="daily"),
        job_row(index=3, salary_min=600000 // 52, salary_max=600000 // 52, pay_rate="weekly"),
        job_row(index=4, salary_min=50000, salary_max=50000, pay_rate=None),  # null = monthly
        job_row(index=5, salary_min=50000, salary_max=50000, pay_rate="monthly"),
        job_row(index=6, salary_min=600000, salary_max=600000, pay_rate="yearly"),
        job_row(index=7, salary_min=50000, salary_max=50000, pay_rate="monthly"),
    ])

    result = estimate_salary(
        title="Backend Developer",
        skills=["Python"],
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="monthly",
    )

    assert result["status"] == "ok"
    assert result["pay_rate"] == "monthly"
    # 600,000 a year is 50,000 a month however the row happened to store it.
    # Rounding on the daily/weekly rows moves things by a few hundred rupees.
    assert abs(result["typical"] - 50000) < 500


# ── Ladder step 2: skills + city + experience ───


def test_unknown_title_falls_through_to_skills(pool):
    pool(rows(
        10,
        title="Server Side Engineer",
        skills=["Python", "Django", "PostgreSQL"],
        salary_min=70000,
        salary_max=90000,
    ))

    result = estimate_salary(
        title="Backend Ninja Rockstar Guru",  # matches no title in the pool
        skills=["Python", "Django", "PostgreSQL"],
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="monthly",
    )

    assert result["status"] == "ok"
    assert result["method"] == "skills_city_exp"
    assert result["sample_size"] == 10
    assert result["typical"] == 80000


def test_skill_variants_still_match(pool):
    """"React" and "ReactJS" are one skill — that is why skills.py is shared."""
    pool(rows(
        10,
        title="Interface Engineer",
        skills=["ReactJS", "Node.js", "TypeScript"],
        salary_min=60000,
        salary_max=60000,
    ))

    result = estimate_salary(
        title="Something Unmatched",
        skills=["React", "NodeJS", "TypeScript"],
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="monthly",
    )

    assert result["status"] == "ok"
    assert result["method"] == "skills_city_exp"
    assert result["sample_size"] == 10


# ── Ladder step 3: skills, nationwide ───────────


def test_step_3_drops_the_city(pool):
    pool(rows(
        10,
        title="Server Side Engineer",
        skills=["Python", "Django", "PostgreSQL"],
        location="Chennai, Tamil Nadu",
        salary_min=60000,
        salary_max=60000,
    ))

    result = estimate_salary(
        title="Unmatched Title Here",
        skills=["Python", "Django", "PostgreSQL"],
        experience_min=2,
        experience_max=5,
        location="Bangalore",  # no Bangalore rows at all
        pay_rate="monthly",
    )

    assert result["status"] == "ok"
    assert result["method"] == "skills_nationwide"
    assert result["confidence"] == "medium"  # never high below rung 2
    assert any(b["label"] == "Nationwide market" for b in result["basis"])


# ── Ladder step 4: per-skill blend ──────────────


def test_step_4_per_skill_blend(pool):
    # Each job shares exactly one of the five target skills — 20% overlap,
    # well under the 60% the skills rungs require.
    target_skills = ["Python", "Django", "Celery", "Redis", "PostgreSQL"]
    job_rows = []
    for i in range(10):
        job_rows.append(
            job_row(
                index=i,
                title=f"Unrelated Role {i}",
                skills=[target_skills[i % 5], "Bookkeeping", "Tally", "Excel"],
                salary_min=40000,
                salary_max=40000,
            )
        )
    pool(job_rows)

    result = estimate_salary(
        title="Totally Unmatched Role",
        skills=target_skills,
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="monthly",
    )

    assert result["status"] == "ok"
    assert result["method"] == "skill_blend"
    assert result["sample_size"] == 10  # distinct jobs, not weighted hits
    assert result["confidence"] == "medium"  # rungs 4-6 never exceed medium


# ── Ladder step 5: LLM role family ──────────────


def test_step_5_llm_role_family(pool, monkeypatch):
    pool(rows(10, title="Backend Developer", salary_min=55000, salary_max=65000))
    monkeypatch.setattr(rf, "invoke_llm", lambda *a, **k: "backend developer")

    result = estimate_salary(
        title="Quibble Flurb",   # no static family, no title match
        skills=[],               # nothing for rungs 2-4 to work with
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="monthly",
    )

    assert result["status"] == "ok"
    assert result["method"] == "family_city_exp"
    assert result["sample_size"] == 10
    assert result["confidence"] == "medium"
    assert any("Backend Developer" in b["label"] for b in result["basis"])


def test_static_role_family_is_tried_before_the_model(monkeypatch):
    def explode(*a, **k):
        raise AssertionError("the model must not be asked about a known title")

    monkeypatch.setattr(rf, "invoke_llm", explode)
    assert rf.resolve_role_family("Senior MERN Stack Engineer") == (
        "full stack developer",
        "static",
    )
    assert rf.resolve_role_family("Delivery Boy - Bike Required")[0] == "delivery executive"


def test_a_hallucinated_role_family_is_discarded(monkeypatch):
    monkeypatch.setattr(rf, "invoke_llm", lambda *a, **k: "interstellar vibe architect")
    assert rf.llm_role_family("Quibble Flurb") is None


# ── Ladder step 6: benchmark table ──────────────


def test_step_6_benchmark_table(pool, monkeypatch):
    pool(rows(10, title="Backend Developer"))  # nothing a plumber can use

    benchmark = {
        "role_family": "plumber",
        "city": None,
        "experience_min": 0,
        "experience_max": 5,
        "pay_rate": "monthly",
        "currency": "INR",
        "p25": 18000,
        "p50": 22000,
        "p75": 26000,
        "source": "Test Benchmark 2026",
        "effective_from": None,
    }
    monkeypatch.setattr(
        comp, "fetch_salary_benchmarks", lambda family, city=None: [benchmark, dict(benchmark)]
    )
    est.clear_cache()

    result = estimate_salary(
        title="Plumber",
        skills=[],
        experience_min=1,
        experience_max=3,
        location="Mumbai",
        pay_rate="monthly",
    )

    assert result["status"] == "ok"
    assert result["method"] == "benchmark_table"
    assert result["typical"] == 22000
    assert result["range"] == {"min": 18000, "max": 26000}
    assert result["confidence"] == "medium"
    assert any("Test Benchmark 2026" in b["label"] for b in result["basis"])


def test_benchmark_rows_outside_the_experience_band_are_ignored(pool, monkeypatch):
    pool(rows(10, title="Backend Developer"))
    monkeypatch.setattr(
        comp,
        "fetch_salary_benchmarks",
        lambda family, city=None: [{
            "role_family": "plumber", "city": None,
            "experience_min": 10, "experience_max": 20,
            "pay_rate": "monthly", "currency": "INR",
            "p25": 18000, "p50": 22000, "p75": 26000,
            "source": "Test", "effective_from": None,
        }],
    )
    est.clear_cache()

    result = estimate_salary(
        title="Plumber", skills=[], experience_min=0, experience_max=2,
        location="Mumbai", pay_rate="monthly",
    )

    assert result["status"] == "insufficient_data"


# ── Ladder step 7: honest refusal ───────────────


def test_below_minimum_sample_returns_insufficient_data(pool):
    pool(rows(settings.salary_min_sample - 1, title="Backend Developer"))

    result = estimate_salary(
        title="Backend Developer",
        skills=["Python", "Django", "PostgreSQL"],
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="monthly",
    )

    assert result["status"] == "insufficient_data"
    assert result["range"] is None
    assert result["typical"] is None
    assert result["confidence"] == "low"
    assert result["basis"] == []
    assert result["comparison"] is None


def test_empty_pool_returns_insufficient_data(pool):
    pool([])
    result = estimate_salary(title="Backend Developer", skills=["Python"])
    assert result["status"] == "insufficient_data"
    assert result["reason"] == "no_priced_jobs"


def test_disabled_flag_short_circuits(monkeypatch):
    monkeypatch.setattr(settings, "salary_enabled", False)
    result = estimate_salary(title="Backend Developer", skills=["Python"])
    assert result["status"] == "insufficient_data"
    assert result["reason"] == "disabled"


# ── Model outages ───────────────────────────────


def test_llm_outage_still_returns_a_valid_range(pool, monkeypatch):
    pool(rows(10, title="Backend Developer", salary_min=60000, salary_max=80000))

    def down(*a, **k):
        raise ExternalServiceError("AI service overloaded, try again later")

    monkeypatch.setattr(explain_mod, "invoke_llm", down)
    monkeypatch.setattr(rf, "invoke_llm", down)
    est.clear_cache()

    result = estimate_salary(
        title="Backend Developer",
        skills=["Python"],
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="monthly",
    )

    assert result["status"] == "ok"
    assert result["degraded"] is True
    assert result["explanation"] is None
    assert result["typical"] == 70000
    assert result["range"]["min"] <= result["typical"] <= result["range"]["max"]
    assert result["sample_size"] == 10


def test_explanation_containing_digits_is_dropped(pool, monkeypatch):
    pool(rows(10, title="Backend Developer"))
    monkeypatch.setattr(
        explain_mod, "invoke_llm", lambda *a, **k: "Most such roles pay about 12 lakh."
    )
    est.clear_cache()

    result = estimate_salary(
        title="Backend Developer", skills=["Python"],
        experience_min=2, experience_max=5, location="Bangalore", pay_rate="monthly",
    )

    assert result["status"] == "ok"
    assert result["explanation"] is None  # the model never supplies a figure
    assert result["degraded"] is False    # the model answered, we rejected it


def test_explanation_is_tidied(monkeypatch):
    """The prefix, the surrounding quotes and the model's waffle all go."""
    monkeypatch.setattr(
        explain_mod,
        "invoke_llm",
        lambda *a, **k: "Sentence: This estimate reflects similar live adverts. "
                        "I hope that helps!",
    )
    assert explain_mod.explain_estimate("Backend Developer", city="bangalore") == (
        "This estimate reflects similar live adverts."
    )

    monkeypatch.setattr(
        explain_mod, "invoke_llm",
        lambda *a, **k: '"A market estimate taken from similar live adverts"',
    )
    assert explain_mod.explain_estimate("Backend Developer") == (
        "A market estimate taken from similar live adverts."
    )


# ── Clamping to the employer slider ─────────────


def test_range_is_clamped_to_the_slider_maximum(pool):
    pool(rows(10, title="Backend Developer", salary_min=1800000, salary_max=2400000,
              pay_rate="yearly"))

    result = estimate_salary(
        title="Backend Developer",
        skills=["Python"],
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="yearly",
    )

    assert result["status"] == "ok"
    assert result["clamped"] is True
    assert result["range"]["max"] == settings.salary_slider_max
    assert result["typical"] <= settings.salary_slider_max


def test_range_is_clamped_to_the_slider_minimum(pool):
    pool(rows(10, title="Backend Developer", salary_min=500, salary_max=900,
              pay_rate="yearly"))

    result = estimate_salary(
        title="Backend Developer", skills=["Python"],
        experience_min=2, experience_max=5, location="Bangalore", pay_rate="yearly",
    )

    assert result["clamped"] is True
    assert result["range"]["min"] == settings.salary_slider_min
    assert result["typical"] >= settings.salary_slider_min


def test_a_range_inside_the_slider_is_not_flagged_as_clamped(pool):
    pool(rows(10, title="Backend Developer", salary_min=40000, salary_max=60000))
    result = estimate_salary(
        title="Backend Developer", skills=["Python"],
        experience_min=2, experience_max=5, location="Bangalore", pay_rate="monthly",
    )
    assert result["clamped"] is False


# ── Experience and city adjustments ─────────────


def test_asking_for_more_experience_lifts_the_estimate(pool):
    pool(rows(10, title="Backend Developer", experience_min=1, experience_max=3,
              salary_min=50000, salary_max=50000))

    junior = estimate_salary(
        title="Backend Developer", skills=["Python"],
        experience_min=1, experience_max=3, location="Bangalore", pay_rate="monthly",
    )
    est.clear_cache()
    senior = estimate_salary(
        title="Backend Developer", skills=["Python"],
        experience_min=3, experience_max=8, location="Bangalore", pay_rate="monthly",
    )

    assert senior["typical"] > junior["typical"]
    # ...but never by more than the documented cap.
    assert senior["typical"] <= round(junior["typical"] * 1.25) + 1


def test_the_experience_nudge_is_capped(pool):
    pool(rows(10, title="Backend Developer", experience_min=0, experience_max=1,
              salary_min=50000, salary_max=50000))

    result = estimate_salary(
        title="Backend Developer", skills=["Python"],
        experience_min=25, experience_max=30, location="Bangalore", pay_rate="monthly",
    )

    assert result["typical"] == round(50000 * 1.25)


# ── Comparison against the employer's own range ──


def test_comparison_reports_a_range_that_is_too_low(pool):
    pool(rows(10, title="Backend Developer", salary_min=60000, salary_max=80000))

    result = estimate_salary(
        title="Backend Developer", skills=["Python"],
        experience_min=2, experience_max=5, location="Bangalore",
        pay_rate="monthly", current_range=[50000, 60000],
    )

    assert result["typical"] == 70000
    assert result["comparison"]["status"] == "below"
    assert result["comparison"]["delta_pct"] == -21
    assert "21%" in result["comparison"]["message"]


def test_comparison_reports_a_range_that_is_in_line(pool):
    pool(rows(10, title="Backend Developer", salary_min=60000, salary_max=80000))
    result = estimate_salary(
        title="Backend Developer", skills=["Python"],
        experience_min=2, experience_max=5, location="Bangalore",
        pay_rate="monthly", current_range=[66000, 74000],
    )
    assert result["comparison"]["status"] == "within"
    assert result["comparison"]["delta_pct"] == 0


def test_comparison_reports_a_range_that_is_too_high(pool):
    pool(rows(10, title="Backend Developer", salary_min=60000, salary_max=80000))
    result = estimate_salary(
        title="Backend Developer", skills=["Python"],
        experience_min=2, experience_max=5, location="Bangalore",
        pay_rate="monthly", current_range=[90000, 100000],
    )
    assert result["comparison"]["status"] == "above"
    assert result["comparison"]["delta_pct"] == 36


def test_comparison_is_null_without_a_current_range(pool):
    pool(rows(10, title="Backend Developer"))
    result = estimate_salary(
        title="Backend Developer", skills=["Python"],
        experience_min=2, experience_max=5, location="Bangalore", pay_rate="monthly",
    )
    assert result["comparison"] is None


def test_cached_estimates_still_recompute_the_comparison(pool):
    pool(rows(10, title="Backend Developer", salary_min=60000, salary_max=80000))

    first = estimate_salary(
        title="Backend Developer", skills=["Python"],
        experience_min=2, experience_max=5, location="Bangalore",
        pay_rate="monthly", current_range=[50000, 60000],
    )
    second = estimate_salary(
        title="Backend Developer", skills=["Python"],
        experience_min=2, experience_max=5, location="Bangalore",
        pay_rate="monthly", current_range=[90000, 100000],
    )

    assert first["typical"] == second["typical"]
    assert first["comparison"]["status"] == "below"
    assert second["comparison"]["status"] == "above"


# ── Response contract ───────────────────────────


EXPECTED_KEYS = {
    "status", "currency", "pay_rate", "range", "typical", "confidence",
    "sample_size", "method", "clamped", "basis", "comparison", "explanation",
    "degraded",
}


def test_successful_response_carries_the_agreed_keys(pool):
    pool(rows(10, title="Backend Developer"))
    result = estimate_salary(
        title="Backend Developer", skills=["Python", "Django", "PostgreSQL"],
        experience_min=2, experience_max=5, location="Bangalore",
        pay_rate="monthly", current_range=[50000, 60000],
    )

    assert EXPECTED_KEYS <= set(result)
    assert {b["icon"] for b in result["basis"]} <= {
        "experience", "role", "skills", "location"
    }
    labels = {b["icon"]: b["label"] for b in result["basis"]}
    assert labels["experience"] == "2-5 years experience"
    assert labels["skills"] == "Python + Django + PostgreSQL"
    assert labels["location"] == "Bangalore market"


def test_insufficient_response_carries_the_agreed_keys(pool):
    pool([])
    result = estimate_salary(title="Backend Developer", skills=["Python"])
    assert EXPECTED_KEYS <= set(result)


# ── HTTP surface ────────────────────────────────


def test_endpoint_returns_an_estimate(client, pool):
    pool(rows(10, title="Backend Developer", salary_min=60000, salary_max=80000))

    res = client.post("/salary-estimate", json={
        "title": "Backend Developer",
        "skills": ["Python", "Django"],
        "experience_min": 2,
        "experience_max": 5,
        "location": "Bangalore, Karnataka",
        "pay_rate": "monthly",
        "current_range": [50000, 60000],
    })

    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["typical"] == 70000
    assert body["comparison"]["status"] == "below"


def test_endpoint_is_also_mounted_under_ai(client, pool):
    pool(rows(10, title="Backend Developer"))
    res = client.post("/ai/salary-estimate", json={"title": "Backend Developer",
                                                   "skills": ["Python"]})
    assert res.status_code == 200
    assert res.json()["status"] in {"ok", "insufficient_data"}


def test_endpoint_requires_a_title(client):
    assert client.post("/salary-estimate", json={}).status_code == 422
    assert client.post("/salary-estimate", json={"title": ""}).status_code == 422


# ── Dispersion guard ────────────────────────────
#
# Enough comparables is not the same as comparable comparables. Against the real
# pool, "ABC Developer" in Bangalore produced a 16-job skill blend whose p25-p75
# ran 17k to 190k a month: a band containing almost every salary on the portal,
# presented as an estimate.


def _scattered_pool(count: int = 20) -> list[dict]:
    """Same title and skills, but interns and directors in one bucket."""
    out = []
    for i in range(count):
        low = 8000 if i % 2 == 0 else 120000
        out.append(
            job_row(
                index=i,
                title="Backend Developer",
                salary_min=low,
                salary_max=low + 4000,
            )
        )
    return out


def test_scattered_comparables_are_rejected_not_averaged(pool):
    pool(_scattered_pool())

    result = est.estimate_salary(
        title="Backend Developer",
        skills=["Python", "Django", "PostgreSQL"],
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="monthly",
    )

    assert result["status"] == "insufficient_data"
    assert result["reason"] == "inconsistent_comparables"
    # Nothing numeric may leak out of a rejected estimate.
    assert result["range"] is None
    assert result["typical"] is None
    # The sample size is still reported — the employer should be able to see
    # that we looked and found plenty, just nothing coherent.
    assert result["sample_size"] > 0


def test_moderately_wide_band_is_shown_but_never_confident(pool):
    # p75/p25 lands between the two thresholds: worth showing, not worth
    # calling confident, however many rows produced it.
    spread_rows = []
    for i in range(30):
        low = (30000, 60000, 130000)[i % 3]
        spread_rows.append(job_row(index=i, salary_min=low, salary_max=low + 2000))
    pool(spread_rows)

    result = est.estimate_salary(
        title="Backend Developer",
        skills=["Python", "Django", "PostgreSQL"],
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="monthly",
    )

    assert result["status"] == "ok"
    assert result["sample_size"] >= 25
    assert result["confidence"] == "low"


def test_tight_band_still_reaches_high_confidence(pool):
    pool(rows(30, salary_min=60000, salary_max=80000))

    result = est.estimate_salary(
        title="Backend Developer",
        skills=["Python", "Django", "PostgreSQL"],
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="monthly",
    )

    assert result["status"] == "ok"
    assert result["confidence"] == "high"


def test_skill_priced_estimate_does_not_claim_a_title_match(pool):
    # Nothing shares the title, so the estimate comes off the skills rung. It
    # must not echo the employer's own title back as a "closest match".
    pool(rows(12, title="Backend Developer"))

    result = est.estimate_salary(
        title="ABC Developer",
        skills=["Python", "Django", "PostgreSQL"],
        experience_min=2,
        experience_max=5,
        location="Bangalore",
        pay_rate="monthly",
    )

    assert result["status"] == "ok"
    role_labels = [b["label"] for b in result["basis"] if b["icon"] == "role"]
    assert role_labels == ["Priced on skills, not job title"]
    assert not any("ABC Developer" in label for label in role_labels)
