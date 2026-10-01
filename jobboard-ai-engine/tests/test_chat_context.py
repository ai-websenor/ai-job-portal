"""Unit tests for chat grounding: context, suggestions, fallback, cleanup.

These run without a database or an LLM — the point is that everything which
decides *what the bot is allowed to say* is pure, so it can be pinned down.
"""

from datetime import datetime, timedelta

import pytest

from app.chat import fallback
from app.chat.chatbot import _clean_reply, _to_bubbles
from app.chat.context import build_context, clean_text, suggest_topics
from app.chat.prompts import build_system_prompt


def make_job(**overrides):
    job = {
        "id": "11111111-1111-1111-1111-111111111111",
        "title": "Senior React Developer",
        "description": "<p>Build the web app.</p><ul><li>Own the design system</li></ul>",
        "skills": ["React", "react", "TypeScript"],
        "job_type": ["full_time"],
        "work_mode": ["hybrid"],
        "experience_level": "senior",
        "experience_min": 4,
        "experience_max": 8,
        "city": "Bangalore",
        "state": "Karnataka",
        "country": "India",
        "salary_min": 1800000,
        "salary_max": 3000000,
        "show_salary": True,
        "is_active": True,
        "status": "active",
        "company_name": "Acme Ltd",
        "industry": "SaaS",
    }
    job.update(overrides)
    return job


# ── Text hygiene ────────────────────────────────


def test_clean_text_strips_html_and_decodes_entities():
    assert clean_text("<p>Hello&nbsp;&amp; welcome</p>") == "Hello & welcome"


def test_clean_text_renders_list_items_as_single_spaced_bullets():
    out = clean_text("<ul><li>One</li><li>Two</li></ul>")
    assert out == "- One\n- Two"


def test_clean_text_drops_script_contents():
    assert "alert" not in clean_text("<script>alert(1)</script>Real text")


def test_clean_text_truncates_on_a_word_boundary():
    out = clean_text("word " * 400, 100)
    assert len(out) <= 102
    assert out.endswith("…")
    assert "wor…" not in out


# ── Absent fields must not become placeholders ──


def test_missing_fields_are_omitted_not_rendered_as_na():
    ctx = build_context({"id": "1", "title": "Data Analyst", "is_active": True, "status": "active"})
    # Asserted against the facts block, not the whole prompt: the grounding
    # rules mention "N/A" on purpose, to forbid the model from writing it.
    facts = ctx.render_job()
    assert "N/A" not in facts
    assert "(?" not in facts
    assert "Location" not in facts
    assert "Salary" not in facts
    assert dict(ctx.facts) == {"Title": "Data Analyst"}


def test_absent_topic_is_never_suggested():
    ctx = build_context(make_job(salary_min=None, salary_max=None))
    assert "salary" not in ctx.topics
    assert "What is the salary range?" not in suggest_topics(ctx, "")


# ── Salary privacy ──────────────────────────────


def test_show_salary_false_hides_the_range_entirely():
    ctx = build_context(make_job(show_salary=False))
    assert "salary" not in ctx.topics
    assert "1800000" not in build_system_prompt(ctx)
    assert "18 LPA" not in build_system_prompt(ctx)


def test_annual_salary_renders_in_lakhs():
    ctx = build_context(make_job())
    assert dict(ctx.facts)["Salary"] == "₹18 LPA - ₹30 LPA"


def test_non_annual_pay_rate_keeps_raw_figures_and_unit():
    ctx = build_context(make_job(salary_min=50000, salary_max=80000, pay_rate="per month"))
    assert dict(ctx.facts)["Salary"] == "₹50,000 - ₹80,000 per month"


# ── Enum rendering ──────────────────────────────


@pytest.mark.parametrize(
    "field,raw,expected",
    [("job_type", ["full_time"], "Full time"), ("work_mode", ["hybrid"], "Hybrid")],
)
def test_enum_tokens_are_rendered_as_labels(field, raw, expected):
    ctx = build_context(make_job(**{field: raw}))
    assert expected in dict(ctx.facts).values()


def test_company_size_range_is_left_alone():
    ctx = build_context(make_job(company_size="51-200"))
    assert "51-200" in build_system_prompt(ctx)


def test_duplicate_skills_are_collapsed_case_insensitively():
    ctx = build_context(make_job())
    assert dict(ctx.facts)["Required skills"] == "React, TypeScript"


# ── Listing state ───────────────────────────────


def test_inactive_job_is_reported_as_closed():
    ctx = build_context(make_job(status="closed"))
    assert ctx.is_open is False
    assert "closed" in build_system_prompt(ctx).lower()


def test_past_deadline_closes_the_listing():
    ctx = build_context(make_job(deadline=datetime.now() - timedelta(days=1)))
    assert ctx.is_open is False


def test_future_deadline_keeps_the_listing_open():
    ctx = build_context(make_job(deadline=datetime.now() + timedelta(days=30)))
    assert ctx.is_open is True
    assert "deadline" in ctx.topics


# ── Suggestions ─────────────────────────────────


def test_suggestions_span_different_topic_groups():
    ctx = build_context(make_job())
    picks = suggest_topics(ctx, "")
    assert len(picks) == 3
    assert len(set(picks)) == 3


def test_answered_topic_stops_being_suggested():
    ctx = build_context(make_job())
    assert "What is the salary range?" not in suggest_topics(ctx, "what is the salary here")


def test_fit_suggestions_only_appear_with_a_profile():
    without = build_context(make_job())
    assert "fit" not in without.topics

    profile = {"first_name": "Asha", "skills": [{"name": "React"}]}
    with_profile = build_context(make_job(), profile)
    assert "fit" in with_profile.topics


# ── Candidate context ───────────────────────────


def test_candidate_pii_is_kept_out_of_the_prompt():
    profile = {
        "first_name": "Asha",
        "last_name": "Rao",
        "phone": "9876543210",
        "date_of_birth": "1994-02-11",
        "address_line1": "12 MG Road",
        "gender": "female",
        "user_email": "asha@example.com",
        "skills": [{"name": "React", "proficiency_level": "advanced", "years_of_experience": 5}],
    }
    prompt = build_system_prompt(build_context(make_job(), profile))
    for secret in ("9876543210", "1994-02-11", "12 MG Road", "asha@example.com", "female"):
        assert secret not in prompt
    assert "Asha" in prompt
    assert "React" in prompt


def test_work_history_reaches_the_prompt():
    profile = {
        "first_name": "Asha",
        "skills": [],
        "experience": [
            {
                "job_title": "Frontend Engineer",
                "company_name": "Globex",
                "start_date": datetime(2020, 1, 1),
                "is_current": True,
                "skills_used": ["React", "Redux"],
            }
        ],
    }
    prompt = build_system_prompt(build_context(make_job(), profile))
    assert "Frontend Engineer at Globex" in prompt
    assert "2020 - present" in prompt


# ── Fallback answers ────────────────────────────


@pytest.mark.parametrize("message", ["hi", "Hello!", "hey there" , "good morning"])
def test_greetings_short_circuit_without_the_model(message):
    ctx = build_context(make_job())
    intent = fallback.detect_intent(message if message != "hey there" else "hey")
    assert fallback.canned_reply(ctx, intent) is not None


def test_apply_question_points_at_the_apply_button():
    ctx = build_context(make_job())
    reply = fallback.fallback_reply(ctx, "how do i apply for this?")
    assert "Apply button" in reply


def test_apply_question_on_a_closed_listing_says_so():
    ctx = build_context(make_job(status="closed"))
    assert "closed" in fallback.fallback_reply(ctx, "how do i apply?").lower()


def test_fallback_answers_salary_from_the_row():
    ctx = build_context(make_job())
    assert "18 LPA" in fallback.fallback_reply(ctx, "what's the ctc?")


def test_fallback_never_invents_an_absent_fact():
    ctx = build_context(make_job(salary_min=None, salary_max=None))
    reply = fallback.fallback_reply(ctx, "what is the salary?")
    assert "doesn't mention" in reply


def test_fallback_names_the_missing_skills():
    profile = {"first_name": "Asha", "skills": [{"name": "React"}]}
    ctx = build_context(make_job(), profile)
    assert "TypeScript" in fallback.fallback_reply(ctx, "what skills am i missing?")


# ── Reply hygiene ───────────────────────────────


def test_clean_reply_strips_role_labels_markdown_and_links():
    raw = "Assistant: **Sure!** See https://example.com/jobs/1 for more."
    out = _clean_reply(raw)
    assert not out.startswith("Assistant")
    assert "**" not in out
    assert "http" not in out


def test_clean_reply_drops_a_hallucinated_next_turn():
    out = _clean_reply("The salary is 18 LPA.\nCandidate: and the location?")
    assert "Candidate:" not in out
    assert out == "The salary is 18 LPA."


def test_clean_reply_removes_na_placeholders():
    assert "N/A" not in _clean_reply("The deadline is N/A for this role.")


def test_bubbles_are_capped_and_lossless():
    text = " ".join(f"Sentence number {i}." for i in range(1, 11))
    bubbles = _to_bubbles(text)
    assert len(bubbles) <= 3
    assert "Sentence number 10." in " ".join(bubbles)


def test_a_bulleted_answer_stays_in_one_bubble():
    assert len(_to_bubbles("The skills are:\n- React\n- TypeScript")) == 1
