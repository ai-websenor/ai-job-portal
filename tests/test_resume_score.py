"""Resume scoring: the score is arithmetic, and the model cannot touch it.

These run entirely in memory. The database and the LLM are both replaced,
because what is being checked is the promise the feature makes to a candidate:
the same profile always gets the same number, the number survives the model
being down, and every card they are shown leads somewhere they can act.
"""

from datetime import date, datetime

import pytest

from app.exceptions import ExternalServiceError
from app.resume_score import rules, scorer, store, suggestions
from app.resume_score.extract import ScoreInput, owned_skills, required_skills

TODAY = date(2026, 9, 18)

# Every deep link the cards may use: /profile?tab=N.
VALID_TABS = {1, 2, 3, 4, 5, 6, 7, 8}

JOB = {
    "id": "b0000000-0000-0000-0000-000000000001",
    "title": "Full Stack Developer",
    "skills": ["React", "Node.js", "Docker", "PostgreSQL"],
    "experience_min": 3,
    "experience_max": 6,
}

RESUME = {
    "id": "c0000000-0000-0000-0000-000000000001",
    "name": "Software Engineer Resume",
    "updated_at": datetime(2026, 9, 1, 10, 0, 0),
    "raw_text": "",
}


def profile(**overrides) -> dict:
    """A solid candidate. Tests take things away from this rather than add."""
    base = {
        "user_email": "arjun@example.com",
        "phone": "+91 99999 00000",
        "professional_summary": " ".join(["word"] * 40),
        "total_experience_years": 5,
        "completion_percentage": 90,
        "skills": [{"name": "React"}, {"name": "Node.js"}, {"name": "PostgreSQL"}],
        "education": [{"institution": "IIT", "degree": "B.Tech"}],
        "experience": [
            {
                "company_name": "TechVista",
                "job_title": "Senior Engineer",
                "is_current": True,
                "start_date": date(2022, 1, 1),
                "end_date": None,
                "description": "Led a team of 6 and reduced build times by 40%.",
                "achievements": "Shipped 12 releases.",
                "skills_used": ["React", "Node.js"],
            },
        ],
    }
    base.update(overrides)
    return base


def make_input(prof=None, job=JOB, resume=RESUME, raw_text=None) -> ScoreInput:
    prof = profile() if prof is None else prof
    resume_row = dict(resume) if resume else None
    text = raw_text if raw_text is not None else (resume_row or {}).get("raw_text", "")
    return ScoreInput(
        user_id="d0000000-0000-0000-0000-000000000001",
        profile=prof,
        resume=resume_row,
        job=dict(job) if job else None,
        raw_text=text or "",
        owned_skills=owned_skills(prof),
        required_skills=required_skills(job),
    )


@pytest.fixture(autouse=True)
def no_llm(monkeypatch):
    """No test may reach a real model or a real database by accident."""
    def explode(*args, **kwargs):
        raise AssertionError("a test called the LLM without saying so")

    monkeypatch.setattr(suggestions, "invoke_llm", explode)
    monkeypatch.setattr(scorer, "save_analysis", lambda **kwargs: False)
    monkeypatch.setattr(scorer, "load_analysis", lambda *a, **k: None)
    monkeypatch.setattr(suggestions.settings, "resume_score_enabled", True)


def with_profile(monkeypatch, data: ScoreInput):
    monkeypatch.setattr(scorer, "load_score_input", lambda user_id, job_id=None: data)


def static_wording(monkeypatch):
    """Skip the model entirely, leaving the deterministic wording in place."""
    monkeypatch.setattr(
        scorer, "polish_improvements", lambda improvements, job=None: (improvements, False)
    )


# -- determinism ---------------------------------------------------------


def test_the_same_profile_scores_the_same_every_time():
    data = make_input()

    first = rules.evaluate(data, today=TODAY)
    second = rules.evaluate(make_input(), today=TODAY)

    assert first["score"] == second["score"]
    assert first["breakdown"] == second["breakdown"]
    assert first["missing_keywords"] == second["missing_keywords"]
    assert [c["id"] for c in first["improvements"]] == [
        c["id"] for c in second["improvements"]
    ]


def test_rechecking_without_changing_anything_does_not_move_the_score(monkeypatch):
    with_profile(monkeypatch, make_input())
    static_wording(monkeypatch)

    first = scorer.score_resume("u", JOB["id"], force=True)
    second = scorer.score_resume("u", JOB["id"], force=True)

    assert first["score"] == second["score"]
    assert first["improvements"] == second["improvements"]


# -- skills and keywords -------------------------------------------------


def test_a_skill_spelled_differently_is_not_counted_twice():
    """React, ReactJS and react.js are one requirement, not three."""
    job = dict(JOB, skills=["React", "ReactJS", "react.js"])
    data = make_input(job=job)

    result = rules.evaluate(data, today=TODAY)

    assert result["missing_keywords"] == []
    assert len(result["matched_keywords"]) == 1
    assert result["breakdown"][0]["score"] == 100


def test_a_differently_spelled_profile_skill_still_matches():
    data = make_input(
        prof=profile(skills=[{"name": "ReactJS"}], experience=[]),
        job=dict(JOB, skills=["React"]),
    )

    result = rules.evaluate(data, today=TODAY)

    assert result["missing_keywords"] == []


def test_skills_the_job_wants_and_the_profile_lacks_become_missing_keywords():
    data = make_input()

    result = rules.evaluate(data, today=TODAY)

    assert result["missing_keywords"] == ["Docker"]
    assert "Docker" not in result["matched_keywords"]
    assert any(c["id"] == "missing-skills" for c in result["improvements"])


def test_a_skill_only_in_the_resume_counts_but_is_still_flagged():
    """The profile is what employers search, so it still needs adding there."""
    data = make_input(raw_text="Built and shipped services with Docker and Kubernetes.")

    result = rules.evaluate(data, today=TODAY)

    assert result["missing_keywords"] == []
    assert "Docker" in result["matched_keywords"]
    assert any(c["id"] == "skills-only-in-resume" for c in result["improvements"])


def test_a_short_skill_does_not_match_inside_a_longer_word():
    data = make_input(
        prof=profile(skills=[], experience=[{"company_name": "X", "is_current": True,
                                             "start_date": date(2022, 1, 1),
                                             "description": "Worked at Google.",
                                             "skills_used": []}]),
        job=dict(JOB, skills=["Go"]),
        raw_text="I worked at Google on googling things.",
    )

    result = rules.evaluate(data, today=TODAY)

    assert result["missing_keywords"] == ["Go"]


# -- the empty profile guard --------------------------------------------


def test_a_profile_with_nothing_on_it_is_not_given_a_humiliating_score(monkeypatch):
    empty = make_input(prof=profile(skills=[], experience=[]), resume=None)
    with_profile(monkeypatch, empty)

    assert scorer.score_resume("u", JOB["id"]) == {"status": "no_profile"}


def test_a_missing_profile_is_reported_the_same_way(monkeypatch):
    nothing = ScoreInput(user_id="u", profile=None, resume=None, job=None)
    with_profile(monkeypatch, nothing)

    assert scorer.score_resume("u", None) == {"status": "no_profile"}


def test_skills_alone_are_enough_to_be_worth_scoring(monkeypatch):
    data = make_input(prof=profile(experience=[]))
    with_profile(monkeypatch, data)
    static_wording(monkeypatch)

    assert scorer.score_resume("u", JOB["id"])["status"] == "ok"


# -- the model being unavailable ----------------------------------------


def test_an_llm_outage_keeps_the_score_and_the_static_wording(monkeypatch):
    def fail(*args, **kwargs):
        raise ExternalServiceError("AI service timeout")

    monkeypatch.setattr(suggestions, "invoke_llm", fail)
    data = make_input()
    with_profile(monkeypatch, data)

    expected = rules.evaluate(data, today=date.today())
    result = scorer.score_resume("u", JOB["id"], force=True)

    assert result["degraded"] is True
    assert result["score"] == expected["score"]
    assert result["missing_keywords"] == ["Docker"]
    assert result["improvements"] == expected["improvements"]


def test_an_outage_never_leaks_the_error_to_the_candidate(monkeypatch):
    def fail(*args, **kwargs):
        raise ExternalServiceError("AI service overloaded, try again later")

    monkeypatch.setattr(suggestions, "invoke_llm", fail)
    with_profile(monkeypatch, make_input())

    result = scorer.score_resume("u", JOB["id"], force=True)
    text = " ".join(
        f"{c['title']} {c['description']}" for c in result["improvements"]
    ) + result["summary"] + result["headline"]

    for leak in ("timeout", "overloaded", "503", "Traceback", "AI service"):
        assert leak.lower() not in text.lower()


def test_unparseable_model_output_falls_back_rather_than_shipping_junk(monkeypatch):
    monkeypatch.setattr(suggestions, "invoke_llm", lambda *a, **k: "Sure! Here you go.")
    data = make_input()

    polished, degraded = suggestions.polish_improvements(
        rules.evaluate(data, today=TODAY)["improvements"], data.job
    )

    assert degraded is True
    assert polished[0]["title"] == rules.evaluate(data, today=TODAY)["improvements"][0]["title"]


def test_a_rewrite_that_invents_a_statistic_is_thrown_away(monkeypatch):
    data = make_input()
    improvements = rules.evaluate(data, today=TODAY)["improvements"]
    card = improvements[0]

    reply = (
        '[{"id": "%s", "title": "Add the missing skills",'
        ' "description": "Docker appears in 73%% of similar jobs, so adding it'
        ' would help you a lot here."}]' % card["id"]
    )
    monkeypatch.setattr(suggestions, "invoke_llm", lambda *a, **k: reply)

    polished, degraded = suggestions.polish_improvements(improvements, data.job)

    assert polished[0]["description"] == card["description"]
    assert degraded is True  # nothing usable came back


def test_a_clean_rewrite_is_used_and_is_not_degraded(monkeypatch):
    data = make_input()
    improvements = rules.evaluate(data, today=TODAY)["improvements"]
    reply = "[" + ", ".join(
        '{"id": "%s", "title": "Tidy title here", "description": "A clear, friendly '
        'sentence telling you what to change next on your profile."}' % c["id"]
        for c in improvements
    ) + "]"
    monkeypatch.setattr(suggestions, "invoke_llm", lambda *a, **k: reply)

    polished, degraded = suggestions.polish_improvements(improvements, data.job)

    assert degraded is False
    assert polished[0]["title"] == "Tidy title here"
    # Wording changes; the identity, priority and destination never do.
    assert polished[0]["id"] == improvements[0]["id"]
    assert polished[0]["action"] == improvements[0]["action"]
    assert polished[0]["priority"] == improvements[0]["priority"]


def test_turning_the_feature_flag_off_still_returns_a_real_score(monkeypatch):
    monkeypatch.setattr(suggestions.settings, "resume_score_enabled", False)
    data = make_input()
    with_profile(monkeypatch, data)

    result = scorer.score_resume("u", JOB["id"], force=True)

    assert result["degraded"] is True
    assert result["score"] == rules.evaluate(data, today=date.today())["score"]


# -- the shape of a response --------------------------------------------


def test_every_improvement_points_at_a_real_profile_tab():
    bare = profile(
        professional_summary="",
        completion_percentage=20,
        phone="",
        education=[],
        total_experience_years=1,
        skills=[{"name": "Excel"}],
        experience=[{"company_name": "Shop", "job_title": "Assistant",
                     "is_current": False, "start_date": None, "end_date": None,
                     "description": "Helped customers.", "skills_used": []}],
    )
    data = make_input(prof=bare, resume=None)

    result = rules.evaluate(data, today=TODAY)

    assert result["improvements"]
    for card in result["improvements"]:
        assert card["action"]["tab"] in VALID_TABS
        assert card["priority"] in ("high", "medium", "low")
        assert card["id"] and card["title"] and card["description"]
        assert card["action"]["label"]


def test_cards_are_capped_and_ordered_by_priority():
    bare = profile(
        professional_summary="", completion_percentage=0, phone="", education=[],
        total_experience_years=0, skills=[], experience=[],
    )
    result = rules.evaluate(make_input(prof=bare, resume=None), today=TODAY)

    priorities = [rules.PRIORITY_ORDER[c["priority"]] for c in result["improvements"]]

    assert priorities == sorted(priorities)
    assert len(result["improvements"]) <= rules.settings.resume_score_max_suggestions


def test_improvement_ids_are_unique_within_one_response():
    bare = profile(professional_summary="", completion_percentage=10, phone="",
                   education=[], skills=[])
    result = rules.evaluate(make_input(prof=bare, resume=None), today=TODAY)
    ids = [c["id"] for c in result["improvements"]]

    assert len(ids) == len(set(ids))


def test_breakdown_is_three_percentages_between_zero_and_one_hundred():
    for data in (make_input(), make_input(prof=profile(skills=[], experience=[]))):
        result = rules.evaluate(data, today=TODAY)

        assert [bar["key"] for bar in result["breakdown"]] == [
            "skills", "experience", "content"
        ]
        for bar in result["breakdown"]:
            assert 0 <= bar["score"] <= 100
            assert bar["label"]


def test_the_score_never_leaves_the_scale():
    worst = make_input(
        prof=profile(professional_summary="", completion_percentage=0, phone="",
                     user_email="", education=[], total_experience_years=0,
                     skills=[], experience=[]),
        resume=None,
    )
    best = make_input(prof=profile(
        skills=[{"name": s} for s in ("React", "Node.js", "Docker", "PostgreSQL")],
    ), raw_text=" ".join(["word"] * 400))

    # The floor is not quite zero: with no resume on file there is no mixed
    # date formatting to find, and we do not charge for a check we cannot run.
    assert 0 <= rules.evaluate(worst, today=TODAY)["score"] <= 10
    assert rules.evaluate(best, today=TODAY)["score"] == 100


def test_a_full_response_carries_every_key_the_widget_reads(monkeypatch):
    data = make_input()
    with_profile(monkeypatch, data)
    static_wording(monkeypatch)

    result = scorer.score_resume("u", JOB["id"], force=True)

    for key in ("status", "score", "band", "headline", "summary", "breakdown",
                "matched_keywords", "missing_keywords", "improvements",
                "target_job", "resume", "generated_at", "degraded"):
        assert key in result, key
    assert result["target_job"] == {"id": JOB["id"], "title": "Full Stack Developer"}
    assert result["resume"]["name"] == "Software Engineer Resume"
    assert result["band"] in ("excellent", "good", "fair", "needs_work")


# -- a generic score, with no job ---------------------------------------


def test_a_score_with_no_target_job_still_works(monkeypatch):
    data = make_input(job=None)
    with_profile(monkeypatch, data)
    static_wording(monkeypatch)

    result = scorer.score_resume("u", None, force=True)

    assert result["status"] == "ok"
    assert result["target_job"] is None
    assert result["missing_keywords"] == []
    assert 0 < result["score"] <= 100


def test_a_thin_skill_list_costs_points_on_a_generic_score():
    few = rules.evaluate(make_input(prof=profile(skills=[{"name": "React"}]), job=None),
                         today=TODAY)
    many = rules.evaluate(
        make_input(
            prof=profile(skills=[{"name": n} for n in (
                "React", "Node.js", "Docker", "PostgreSQL", "AWS", "Python",
                "TypeScript", "Redis")]),
            job=None,
        ),
        today=TODAY,
    )

    assert few["breakdown"][0]["score"] < many["breakdown"][0]["score"]
    assert any(c["id"] == "few-skills" for c in few["improvements"])


# -- individual checks ---------------------------------------------------


def test_a_role_with_no_numbers_asks_the_candidate_to_quantify():
    quiet = profile(experience=[{
        "company_name": "TechVista", "job_title": "Engineer", "is_current": True,
        "start_date": date(2022, 1, 1), "end_date": None,
        "description": "Led the team and built the platform and shipped features.",
        "skills_used": ["React", "Node.js"],
    }])

    result = rules.evaluate(make_input(prof=quiet), today=TODAY)

    assert any(c["id"] == "quantify-achievements" for c in result["improvements"])


def test_a_stale_history_asks_for_a_current_role():
    stale = profile(experience=[{
        "company_name": "Old Co", "job_title": "Engineer", "is_current": False,
        "start_date": date(2015, 1, 1), "end_date": date(2017, 1, 1),
        "description": "Built and led and shipped 4 products.",
        "skills_used": ["React"],
    }])

    result = rules.evaluate(make_input(prof=stale), today=TODAY)

    assert any(c["id"] == "no-current-role" for c in result["improvements"])


def test_a_short_summary_is_asked_to_grow_not_to_appear():
    thin = profile(professional_summary="Engineer who builds things.")

    ids = [c["id"] for c in rules.evaluate(make_input(prof=thin), today=TODAY)["improvements"]]

    assert "expand-summary" in ids
    assert "add-summary" not in ids


def test_mixed_date_formats_in_the_resume_are_flagged():
    data = make_input(raw_text="Jan 2020 - 01/02/2021 at TechVista. " * 2)

    ids = [c["id"] for c in rules.evaluate(data, today=TODAY)["improvements"]]

    assert "fix-inconsistent-dates" in ids


def test_an_unparsed_resume_is_not_held_against_the_candidate():
    """189 resumes exist, 66 are parsed - that backlog is ours, not theirs."""
    unparsed = rules.evaluate(make_input(raw_text=""), today=TODAY)
    missing = rules.evaluate(make_input(resume=None), today=TODAY)

    assert unparsed["score"] > missing["score"]
    assert any(c["id"] == "upload-resume" for c in missing["improvements"])


def test_being_more_experienced_than_the_job_asks_is_not_penalised():
    senior = rules.evaluate(
        make_input(prof=profile(total_experience_years=15)), today=TODAY)
    inside = rules.evaluate(
        make_input(prof=profile(total_experience_years=5)), today=TODAY)

    assert senior["breakdown"][1]["score"] == inside["breakdown"][1]["score"]


def test_too_little_experience_is_flagged_without_zeroing_the_bucket():
    junior = rules.evaluate(
        make_input(prof=profile(total_experience_years=1)), today=TODAY)

    assert any(c["id"] == "experience-below-band" for c in junior["improvements"])
    assert junior["breakdown"][1]["score"] > 0


# -- storage round trip --------------------------------------------------


def test_a_cached_read_returns_exactly_what_was_written(monkeypatch):
    saved = {}

    def capture(resume_id, user_id, job_id, result, ats_issues=None):
        saved.update(store.serialize(result, ats_issues))
        saved["analyzed_at"] = datetime(2026, 9, 18, 10, 2, 0)
        saved["age_seconds"] = 5.0
        return True

    data = make_input()
    with_profile(monkeypatch, data)
    static_wording(monkeypatch)
    monkeypatch.setattr(scorer, "save_analysis", lambda **kwargs: capture(**kwargs))

    fresh = scorer.score_resume("u", JOB["id"], force=True)
    cached = store.deserialize(saved)

    for key in ("status", "score", "band", "headline", "summary", "breakdown",
                "matched_keywords", "missing_keywords", "improvements",
                "target_job", "resume", "degraded"):
        assert cached[key] == fresh[key], key
    assert cached["generated_at"] == "2026-09-18T10:02:00"


def test_a_fresh_cached_row_is_served_instead_of_rescoring(monkeypatch):
    stored = {"status": "ok", "score": 77, "band": "good", "headline": "cached",
              "summary": "", "breakdown": [], "matched_keywords": [],
              "missing_keywords": [], "improvements": [], "target_job": None,
              "resume": None, "generated_at": "2026-09-18T10:00:00",
              "degraded": False}

    with_profile(monkeypatch, make_input())
    monkeypatch.setattr(scorer, "load_analysis", lambda *a, **k: stored)
    monkeypatch.setattr(
        scorer, "evaluate",
        lambda *a, **k: pytest.fail("a cached read must not rescore"),
    )

    assert scorer.score_resume("u", JOB["id"], force=False)["headline"] == "cached"


def test_force_ignores_the_cache(monkeypatch):
    with_profile(monkeypatch, make_input())
    static_wording(monkeypatch)
    monkeypatch.setattr(
        scorer, "load_analysis",
        lambda *a, **k: pytest.fail("force=True must not read the cache"),
    )

    assert scorer.score_resume("u", JOB["id"], force=True)["status"] == "ok"


def test_latest_returns_nothing_when_nothing_was_ever_stored(monkeypatch):
    monkeypatch.setattr(scorer, "load_analysis", lambda *a, **k: None)

    assert scorer.get_latest_score("u", JOB["id"]) is None


def test_latest_never_rescores(monkeypatch):
    monkeypatch.setattr(
        scorer, "evaluate", lambda *a, **k: pytest.fail("latest must not rescore")
    )
    monkeypatch.setattr(scorer, "load_analysis", lambda *a, **k: {"score": 80})

    assert scorer.get_latest_score("u", None) == {"score": 80}


def test_a_candidate_with_no_resume_is_still_scored_just_not_cached(monkeypatch):
    data = make_input(resume=None)
    with_profile(monkeypatch, data)
    static_wording(monkeypatch)

    result = scorer.score_resume("u", JOB["id"], force=True)

    assert result["status"] == "ok"
    assert result["resume"] is None
    assert store.save_analysis(None, "u", None, result) is False


# -- the HTTP surface ----------------------------------------------------


def test_the_endpoint_refuses_a_request_with_no_identity(client):
    assert client.post("/resume-score", json={}).status_code == 401
    assert client.post("/ai/resume-score", json={}).status_code == 401


def test_the_endpoint_rejects_a_job_id_that_is_not_a_uuid(client):
    res = client.post(
        "/resume-score",
        json={"job_id": "not-a-uuid"},
        headers={"X-User-Id": "d0000000-0000-0000-0000-000000000001"},
    )

    assert res.status_code == 400


def test_a_user_id_in_the_body_cannot_impersonate_anyone(client, monkeypatch):
    """Identity comes from the gateway header; the body is ignored."""
    seen = {}

    def record(user_id, job_id=None, force=False):
        seen["user_id"] = user_id
        return {"status": "no_profile"}

    monkeypatch.setattr("app.resume_score.routes.score_resume", record)
    header_user = "d0000000-0000-0000-0000-000000000001"

    client.post(
        "/resume-score",
        json={"user_id": "d0000000-0000-0000-0000-000000000009"},
        headers={"X-User-Id": header_user},
    )

    assert seen["user_id"] == header_user
