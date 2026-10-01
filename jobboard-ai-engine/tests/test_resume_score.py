"""Applicant scoring: who is allowed to ask, and what the number is made of.

These run entirely in memory. The database and the LLM are both replaced,
because what is being checked is the promise the feature makes to the person
being scored as much as to the employer doing the scoring:

* an employer only ever sees applicants to their own jobs,
* the number is the same every time, for the same reasons,
* two identical applications score identically whoever they belong to,
* and the model being down costs wording, never the score.
"""

from datetime import date, datetime

import pytest

from app.exceptions import DatabaseError, ExternalServiceError
from app.resume_score import extract, rules, scorer, store, suggestions
from app.resume_score.extract import ScoreInput, owned_skills, required_skills

TODAY = date(2026, 9, 18)

JOB_ID = "b0000000-0000-0000-0000-000000000001"
OTHER_JOB_ID = "b0000000-0000-0000-0000-000000000002"
EMPLOYER_ID = "e0000000-0000-0000-0000-000000000001"
RIVAL_EMPLOYER_ID = "e0000000-0000-0000-0000-000000000009"
APPLICATION_ID = "a0000000-0000-0000-0000-000000000001"
CANDIDATE_ID = "d0000000-0000-0000-0000-000000000001"

JOB = {
    "id": JOB_ID,
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
    """A solid applicant. Tests take things away from this rather than add."""
    base = {
        "user_email": "present",
        "phone": "present",
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
        user_id=CANDIDATE_ID,
        profile=prof,
        resume=resume_row,
        job=dict(job) if job else None,
        raw_text=text or "",
        owned_skills=owned_skills(prof),
        required_skills=required_skills(job),
    )


APPLICATION = {
    "application_id": APPLICATION_ID,
    "candidate_user_id": CANDIDATE_ID,
    "job_id": JOB_ID,
    "job_title": "Full Stack Developer",
    "candidate_name": "Priya Sharma",
}


@pytest.fixture(autouse=True)
def sealed(monkeypatch):
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
        scorer, "polish_observations",
        lambda strengths, gaps, job=None: (strengths, gaps, False),
    )


def allow(monkeypatch, *, job: bool = True, application=APPLICATION,
          applicants=((APPLICATION_ID, CANDIDATE_ID),), exists: bool = True):
    """Stand in for the four authorisation queries in `app.db`.

    Each one is given its own stub so a test can refuse at exactly one of
    them, which is how the refusal tests below stay honest about *which*
    gate did the refusing.
    """
    monkeypatch.setattr(
        scorer, "employer_can_view_job", lambda employer_user_id, job_id: job
    )
    monkeypatch.setattr(
        scorer, "fetch_job_applicants_for_employer",
        lambda employer_user_id, job_id, limit=50: [
            {"application_id": a, "candidate_user_id": c}
            for a, c in applicants
        ][:limit],
    )
    monkeypatch.setattr(
        scorer, "fetch_employer_application",
        lambda employer_user_id, application_id: (
            dict(application) if application else None
        ),
    )
    monkeypatch.setattr(scorer, "application_exists", lambda application_id: exists)


# -- authorisation: the part that matters most ---------------------------


def test_an_employer_from_another_company_is_refused_the_shortlist(monkeypatch):
    """The job is not theirs, so the applicant list does not exist for them."""
    allow(monkeypatch, job=False)
    with_profile(monkeypatch, make_input())

    result = scorer.score_applicants(RIVAL_EMPLOYER_ID, JOB_ID)

    assert result == {"status": "not_authorised"}
    assert "scores" not in result


def test_an_employer_from_another_company_is_refused_one_applicant(monkeypatch):
    """The entitlement query returns nothing, so neither does the endpoint."""
    allow(monkeypatch, application=None, exists=True)
    with_profile(monkeypatch, make_input())

    result = scorer.score_applicant(RIVAL_EMPLOYER_ID, APPLICATION_ID)

    assert result == {"status": "not_authorised"}


def test_a_refusal_never_leaks_who_the_candidate_was(monkeypatch):
    allow(monkeypatch, application=None, exists=True)

    result = scorer.score_applicant(RIVAL_EMPLOYER_ID, APPLICATION_ID)
    text = str(result)

    for leak in ("Priya", "Sharma", CANDIDATE_ID, "Full Stack"):
        assert leak not in text


def test_an_application_that_does_not_exist_is_not_authorised_but_missing(monkeypatch):
    """Told apart only once the entitlement query has already refused."""
    allow(monkeypatch, application=None, exists=False)

    assert scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID) == {
        "status": "not_found"
    }


def test_a_candidate_who_never_applied_cannot_be_scored(monkeypatch):
    """There is no application row, so there is nothing to ask about.

    The endpoint takes an application id and nothing else, so "score this
    user against this job" is not a request that can be made at all — the
    candidate always comes out of a row the database vouched for.
    """
    allow(monkeypatch, application=None, exists=False)
    scored = []
    monkeypatch.setattr(
        scorer, "load_score_input",
        lambda user_id, job_id=None: scored.append(user_id),
    )

    result = scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID)

    assert result["status"] == "not_found"
    assert scored == []  # nothing was loaded, let alone scored


def test_the_shortlist_only_ever_contains_real_applicants(monkeypatch):
    """The candidate ids scored are the ones the entitlement query returned."""
    allow(monkeypatch, applicants=(
        (APPLICATION_ID, CANDIDATE_ID),
        ("a0000000-0000-0000-0000-000000000002", "d0000000-0000-0000-0000-000000000002"),
    ))
    asked = []

    def load(user_id, job_id=None):
        asked.append(user_id)
        return make_input()

    monkeypatch.setattr(scorer, "load_score_input", load)

    scorer.score_applicants(EMPLOYER_ID, JOB_ID)

    assert asked == [CANDIDATE_ID, "d0000000-0000-0000-0000-000000000002"]


def test_the_sql_checks_ownership_and_application_in_one_statement():
    """The entitlement rule lives in the query, not in a later `if`."""
    from app import db

    for query in (
        db.fetch_employer_application.__doc__,
        db.fetch_job_applicants_for_employer.__doc__,
    ):
        assert query  # documented, and the predicate below is shared by both

    assert "owner.id = j.employer_id" in db._EMPLOYER_JOINS
    assert "viewer.user_id = %s" in db._EMPLOYER_PREDICATE
    assert "viewer.company_id IN (owner.company_id, j.company_id)" in \
        db._EMPLOYER_PREDICATE


# -- the shortlist -------------------------------------------------------


def test_the_shortlist_returns_one_entry_per_applicant_and_no_llm(monkeypatch):
    """`sealed` already makes any LLM call an assertion failure."""
    allow(monkeypatch, applicants=(
        (APPLICATION_ID, CANDIDATE_ID),
        ("a0000000-0000-0000-0000-000000000002", "d0000000-0000-0000-0000-000000000002"),
        ("a0000000-0000-0000-0000-000000000003", "d0000000-0000-0000-0000-000000000003"),
    ))
    with_profile(monkeypatch, make_input())

    result = scorer.score_applicants(EMPLOYER_ID, JOB_ID)

    assert result["status"] == "ok"
    assert result["job_id"] == JOB_ID
    assert len(result["scores"]) == 3
    for entry in result["scores"].values():
        assert entry["degraded"] is False
        assert 0 <= entry["score"] <= 100
        assert entry["band"] in ("excellent", "good", "fair", "needs_work")


def test_the_shortlist_is_keyed_by_application_id(monkeypatch):
    allow(monkeypatch)
    with_profile(monkeypatch, make_input())

    scores = scorer.score_applicants(EMPLOYER_ID, JOB_ID)["scores"]

    assert list(scores) == [APPLICATION_ID]
    assert CANDIDATE_ID not in str(list(scores))


def test_an_applicant_with_nothing_on_file_is_null_rather_than_zero(monkeypatch):
    """Zero is a judgement. This is an absence of anything to judge."""
    allow(monkeypatch)
    with_profile(monkeypatch, make_input(prof=profile(skills=[], experience=[])))

    entry = scorer.score_applicants(EMPLOYER_ID, JOB_ID)["scores"][APPLICATION_ID]

    assert entry == {"score": None, "band": None, "reason": "no_profile"}
    # Not a falsy zero dressed up as a null: the UI has to be able to print
    # "no profile" rather than a bar at the far left of the scale.
    assert entry["score"] is None and entry["score"] != 0


def test_one_unreadable_profile_does_not_lose_the_whole_shortlist(monkeypatch):
    allow(monkeypatch, applicants=(
        (APPLICATION_ID, CANDIDATE_ID),
        ("a0000000-0000-0000-0000-000000000002", "d0000000-0000-0000-0000-000000000002"),
    ))

    def load(user_id, job_id=None):
        if user_id == CANDIDATE_ID:
            raise DatabaseError("profile read failed")
        return make_input()

    monkeypatch.setattr(scorer, "load_score_input", load)

    scores = scorer.score_applicants(EMPLOYER_ID, JOB_ID)["scores"]

    assert scores[APPLICATION_ID]["score"] is None
    assert scores["a0000000-0000-0000-0000-000000000002"]["score"] > 0


def test_the_shortlist_limit_is_clamped(monkeypatch):
    allow(monkeypatch)
    seen = {}

    def applicants(employer_user_id, job_id, limit=50):
        seen["limit"] = limit
        return []

    monkeypatch.setattr(scorer, "fetch_job_applicants_for_employer", applicants)

    scorer.score_applicants(EMPLOYER_ID, JOB_ID, limit=10_000)

    assert seen["limit"] == scorer.MAX_BULK_APPLICANTS


# -- fairness ------------------------------------------------------------


def test_two_applicants_differing_only_by_gender_and_name_score_the_same():
    """The whole defence of this feature rests on this test."""
    shared = dict(
        professional_summary=" ".join(["word"] * 40),
        total_experience_years=5,
        completion_percentage=90,
    )
    one = extract.anonymise_profile(profile(
        first_name="Priya", last_name="Sharma", gender="female",
        date_of_birth=date(1994, 3, 2), city="Jaipur",
        user_email="priya@example.com", phone="+91 99999 00000", **shared,
    ))
    other = extract.anonymise_profile(profile(
        first_name="John", last_name="Carter", gender="male",
        date_of_birth=date(1994, 3, 2), city="Jaipur",
        user_email="john@example.com", phone="+44 7700 900000", **shared,
    ))

    first = rules.evaluate(make_input(prof=one), today=TODAY)
    second = rules.evaluate(make_input(prof=other), today=TODAY)

    assert first == second


def test_the_scrub_removes_every_protected_field():
    raw = profile(
        first_name="Priya", middle_name="R", last_name="Sharma",
        gender="female", date_of_birth=date(1994, 3, 2),
        marital_status="married", nationality="Indian",
        profile_photo="https://cdn/x.jpg", video_resume_url="https://cdn/x.mp4",
        city="Jaipur", state="Rajasthan", country="India", pin_code="302001",
        address_line1="12 Lane", email="priya@example.com",
    )

    clean = extract.anonymise_profile(raw)

    for field in ("first_name", "middle_name", "last_name", "gender",
                  "date_of_birth", "marital_status", "nationality",
                  "profile_photo", "video_resume_url", "city", "state",
                  "country", "pin_code", "address_line1", "email"):
        assert field not in clean, field
    # What the job is actually matched on survives untouched.
    assert clean["skills"] == raw["skills"]
    assert clean["experience"] == raw["experience"]


def test_contact_details_survive_only_as_present_or_absent():
    with_number = extract.anonymise_profile(profile(phone="+91 99999 00000"))
    without = extract.anonymise_profile(profile(phone=""))

    assert with_number["phone"] == extract.PRESENT
    assert "99999" not in str(with_number)
    assert without["phone"] == ""


def test_no_wording_anywhere_mentions_a_protected_trait():
    bare = profile(
        professional_summary="", completion_percentage=0, phone="",
        user_email="", education=[], total_experience_years=0,
        skills=[], experience=[],
    )
    for data in (make_input(), make_input(prof=bare, resume=None)):
        result = rules.evaluate(data, today=TODAY)
        text = " ".join(
            [result["headline"], result["summary"]]
            + result["strengths"] + result["gaps"]
        )

        assert not suggestions.FORBIDDEN.search(text), text


def test_a_rewrite_that_describes_the_person_is_thrown_away(monkeypatch):
    gaps = ["No mention of Docker, which this job lists."]
    monkeypatch.setattr(
        suggestions, "invoke_llm",
        lambda *a, **k: '[{"id": "g0", "text": "He has not listed Docker, '
                        'which this job asks for."}]',
    )

    _, polished, degraded = suggestions.polish_observations([], gaps, JOB)

    assert polished == gaps
    assert degraded is True


# -- determinism ---------------------------------------------------------


def test_the_same_application_scores_the_same_every_time():
    first = rules.evaluate(make_input(), today=TODAY)
    second = rules.evaluate(make_input(), today=TODAY)

    assert first == second


def test_rescoring_without_changing_anything_does_not_move_the_number(monkeypatch):
    allow(monkeypatch)
    with_profile(monkeypatch, make_input())
    static_wording(monkeypatch)

    first = scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID, force=True)
    second = scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID, force=True)

    for key in ("score", "band", "strengths", "gaps", "breakdown"):
        assert first[key] == second[key], key


def test_the_shortlist_and_the_detail_page_agree_on_the_number(monkeypatch):
    """Two screens showing one applicant two different scores is worse than
    showing neither."""
    allow(monkeypatch)
    with_profile(monkeypatch, make_input())
    static_wording(monkeypatch)

    bulk = scorer.score_applicants(EMPLOYER_ID, JOB_ID)["scores"][APPLICATION_ID]
    detail = scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID, force=True)

    assert bulk["score"] == detail["score"]
    assert bulk["band"] == detail["band"]


# -- the model being unavailable ----------------------------------------


def test_an_llm_outage_still_gives_a_real_score(monkeypatch):
    def fail(*args, **kwargs):
        raise ExternalServiceError("AI service timeout")

    monkeypatch.setattr(suggestions, "invoke_llm", fail)
    allow(monkeypatch)
    data = make_input()
    with_profile(monkeypatch, data)

    expected = rules.evaluate(data, today=date.today())
    result = scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID, force=True)

    assert result["status"] == "ok"
    assert result["degraded"] is True
    assert result["score"] == expected["score"]
    assert result["matched_keywords"] == expected["matched_keywords"]
    assert result["missing_keywords"] == ["Docker"]
    assert result["strengths"] == expected["strengths"]
    assert result["gaps"] == expected["gaps"]


def test_an_outage_never_leaks_the_error_to_the_employer(monkeypatch):
    def fail(*args, **kwargs):
        raise ExternalServiceError("AI service overloaded, try again later")

    monkeypatch.setattr(suggestions, "invoke_llm", fail)
    allow(monkeypatch)
    with_profile(monkeypatch, make_input())

    result = scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID, force=True)
    text = " ".join(
        result["strengths"] + result["gaps"]
        + [result["summary"], result["headline"]]
    )

    for leak in ("timeout", "overloaded", "503", "Traceback", "AI service"):
        assert leak.lower() not in text.lower()


def test_unparseable_model_output_falls_back_rather_than_shipping_junk(monkeypatch):
    monkeypatch.setattr(suggestions, "invoke_llm", lambda *a, **k: "Sure! Here you go.")
    result = rules.evaluate(make_input(), today=TODAY)

    strengths, gaps, degraded = suggestions.polish_observations(
        result["strengths"], result["gaps"], JOB
    )

    assert degraded is True
    assert strengths == result["strengths"]
    assert gaps == result["gaps"]


def test_a_rewrite_that_invents_a_statistic_is_thrown_away(monkeypatch):
    gaps = ["No mention of Docker, which this job lists."]
    monkeypatch.setattr(
        suggestions, "invoke_llm",
        lambda *a, **k: '[{"id": "g0", "text": "Docker is absent, and it appears '
                        'in 73% of similar roles."}]',
    )

    _, polished, degraded = suggestions.polish_observations([], gaps, JOB)

    assert polished == gaps
    assert degraded is True


def test_a_clean_rewrite_is_used_and_is_not_degraded(monkeypatch):
    strengths = ["Covers 3 of the 4 skills this job lists."]
    gaps = ["No mention of Docker, which this job lists."]
    monkeypatch.setattr(
        suggestions, "invoke_llm",
        lambda *a, **k: '[{"id": "s0", "text": "Three of the four listed skills '
                        'are covered."},'
                        ' {"id": "g0", "text": "Docker is not mentioned anywhere '
                        'on the application."}]',
    )

    polished_s, polished_g, degraded = suggestions.polish_observations(
        strengths, gaps, JOB
    )

    assert degraded is False
    assert polished_g == ["Docker is not mentioned anywhere on the application."]
    # The rewrite may not move a strength into the gaps column.
    assert len(polished_s) == 1 and len(polished_g) == 1


def test_turning_the_feature_flag_off_still_returns_a_real_score(monkeypatch):
    monkeypatch.setattr(suggestions.settings, "resume_score_enabled", False)
    allow(monkeypatch)
    data = make_input()
    with_profile(monkeypatch, data)

    result = scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID, force=True)

    assert result["degraded"] is True
    assert result["score"] == rules.evaluate(data, today=date.today())["score"]


# -- the shape of a response --------------------------------------------


def test_a_full_response_carries_every_key_the_page_reads(monkeypatch):
    allow(monkeypatch)
    with_profile(monkeypatch, make_input())
    static_wording(monkeypatch)

    result = scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID, force=True)

    for key in ("status", "score", "band", "headline", "summary", "breakdown",
                "matched_keywords", "missing_keywords", "strengths", "gaps",
                "candidate", "target_job", "generated_at", "degraded"):
        assert key in result, key
    assert result["candidate"] == {"name": "Priya Sharma",
                                   "application_id": APPLICATION_ID}
    assert result["target_job"] == {"id": JOB_ID, "title": "Full Stack Developer"}
    assert result["band"] in ("excellent", "good", "fair", "needs_work")


def test_the_response_carries_no_advice_for_the_candidate(monkeypatch):
    """An employer cannot edit somebody else's profile."""
    allow(monkeypatch)
    with_profile(monkeypatch, make_input())
    static_wording(monkeypatch)

    result = scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID, force=True)

    assert "improvements" not in result
    assert "resume" not in result
    assert "tab" not in str(result)


def test_strengths_and_gaps_are_plain_third_person_sentences():
    result = rules.evaluate(make_input(), today=TODAY)

    assert result["strengths"] and result["gaps"]
    for line in result["strengths"] + result["gaps"]:
        assert isinstance(line, str)
        assert line == line.strip() and line
        assert " you " not in f" {line.lower()} "
        assert not line.lower().startswith("your ")


def test_the_third_bar_is_labelled_for_the_reader_not_the_author():
    result = rules.evaluate(make_input(), today=TODAY)

    labels = {bar["key"]: bar["label"] for bar in result["breakdown"]}

    assert labels["content"] == "Resume Quality"
    assert labels["skills"] == "Skills & Keywords"
    assert labels["experience"] == "Experience & Impact"


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


def test_an_applicant_with_nothing_on_file_gets_no_profile_not_a_number(monkeypatch):
    allow(monkeypatch)
    with_profile(monkeypatch, make_input(prof=profile(skills=[], experience=[])))

    result = scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID)

    assert result["status"] == "no_profile"
    assert "score" not in result
    assert result["candidate"]["name"] == "Priya Sharma"
    assert result["target_job"] == {"id": JOB_ID, "title": "Full Stack Developer"}


# -- the checks themselves -----------------------------------------------


def test_skills_the_job_wants_and_the_applicant_lacks_become_gaps():
    result = rules.evaluate(make_input(), today=TODAY)

    assert result["missing_keywords"] == ["Docker"]
    assert "Docker" not in result["matched_keywords"]
    assert any("Docker" in gap for gap in result["gaps"])


def test_a_skill_spelled_differently_is_not_counted_twice():
    """React, ReactJS and react.js are one requirement, not three."""
    result = rules.evaluate(make_input(job=dict(JOB, skills=[
        "React", "ReactJS", "react.js"])), today=TODAY)

    assert result["missing_keywords"] == []
    assert len(result["matched_keywords"]) == 1
    assert result["breakdown"][0]["score"] == 100


def test_a_skill_only_in_the_resume_counts_but_is_still_noted():
    """It counts, but the employer's own candidate search reads the profile."""
    result = rules.evaluate(
        make_input(raw_text="Built and shipped services with Docker and Kubernetes."),
        today=TODAY,
    )

    assert result["missing_keywords"] == []
    assert "Docker" in result["matched_keywords"]
    assert any("resume text" in gap for gap in result["gaps"])


def test_a_short_skill_does_not_match_inside_a_longer_word():
    data = make_input(
        prof=profile(skills=[], experience=[{"company_name": "X", "is_current": True,
                                             "start_date": date(2022, 1, 1),
                                             "description": "Worked at Google.",
                                             "skills_used": []}]),
        job=dict(JOB, skills=["Go"]),
        raw_text="I worked at Google on googling things.",
    )

    assert rules.evaluate(data, today=TODAY)["missing_keywords"] == ["Go"]


def test_experience_inside_the_band_reads_as_a_strength():
    result = rules.evaluate(
        make_input(prof=profile(total_experience_years=7)), today=TODAY)

    assert any("7 years of experience against the 3-6" in s
               for s in result["strengths"])


def test_being_more_experienced_than_the_job_asks_is_not_penalised():
    senior = rules.evaluate(
        make_input(prof=profile(total_experience_years=15)), today=TODAY)
    inside = rules.evaluate(
        make_input(prof=profile(total_experience_years=5)), today=TODAY)

    assert senior["breakdown"][1]["score"] == inside["breakdown"][1]["score"]


def test_too_little_experience_is_flagged_without_zeroing_the_bucket():
    junior = rules.evaluate(
        make_input(prof=profile(total_experience_years=1)), today=TODAY)

    assert any("this job asks for" in gap for gap in junior["gaps"])
    assert junior["breakdown"][1]["score"] > 0


def test_a_stale_history_is_reported_as_a_gap():
    stale = profile(experience=[{
        "company_name": "Old Co", "job_title": "Engineer", "is_current": False,
        "start_date": date(2015, 1, 1), "end_date": date(2017, 1, 1),
        "description": "Built and led and shipped 4 products.",
        "skills_used": ["React"],
    }])

    gaps = rules.evaluate(make_input(prof=stale), today=TODAY)["gaps"]

    assert any("most recent listed role" in gap.lower() for gap in gaps)


def test_an_unparsed_resume_is_not_held_against_the_applicant():
    """189 resumes exist, 66 are parsed — that backlog is ours, not theirs."""
    unparsed = rules.evaluate(make_input(raw_text=""), today=TODAY)
    missing = rules.evaluate(make_input(resume=None), today=TODAY)

    assert unparsed["score"] > missing["score"]
    assert any("No resume on file" in gap for gap in missing["gaps"])


def test_gaps_are_capped_and_ordered_by_priority():
    bare = profile(
        professional_summary="", completion_percentage=0, phone="", education=[],
        total_experience_years=0, skills=[], experience=[],
    )
    result = rules.evaluate(make_input(prof=bare, resume=None), today=TODAY)

    assert len(result["gaps"]) <= rules.settings.resume_score_max_suggestions
    assert len(result["gaps"]) == len(set(result["gaps"]))


# -- storage round trip --------------------------------------------------


def test_a_cached_read_returns_exactly_what_was_written(monkeypatch):
    saved = {}

    def capture(resume_id, user_id, job_id, result, ats_issues=None):
        saved.update(store.serialize(result, ats_issues))
        saved["analyzed_at"] = datetime(2026, 9, 18, 10, 2, 0)
        saved["age_seconds"] = 5.0
        return True

    allow(monkeypatch)
    with_profile(monkeypatch, make_input())
    static_wording(monkeypatch)
    monkeypatch.setattr(scorer, "save_analysis", lambda **kwargs: capture(**kwargs))

    fresh = scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID, force=True)
    cached = store.deserialize(saved)

    for key in ("status", "score", "band", "headline", "summary", "breakdown",
                "matched_keywords", "missing_keywords", "strengths", "gaps",
                "candidate", "target_job", "degraded"):
        assert cached[key] == fresh[key], key
    assert cached["generated_at"] == "2026-09-18T10:02:00"


def test_the_cache_is_keyed_on_the_candidate_not_the_employer(monkeypatch):
    """Two colleagues reviewing one shortlist share one computation."""
    seen = {}
    allow(monkeypatch)
    with_profile(monkeypatch, make_input())
    static_wording(monkeypatch)
    monkeypatch.setattr(
        scorer, "save_analysis",
        lambda **kwargs: seen.update(kwargs) or True,
    )

    scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID, force=True)

    assert seen["user_id"] == CANDIDATE_ID
    assert seen["job_id"] == JOB_ID


def test_a_fresh_cached_row_is_served_instead_of_rescoring(monkeypatch):
    stored = {"status": "ok", "score": 77, "band": "good", "headline": "cached",
              "summary": "", "breakdown": [], "matched_keywords": [],
              "missing_keywords": [], "strengths": [], "gaps": [],
              "candidate": None, "target_job": None,
              "generated_at": "2026-09-18T10:00:00", "degraded": False}

    allow(monkeypatch)
    with_profile(monkeypatch, make_input())
    monkeypatch.setattr(scorer, "load_analysis", lambda *a, **k: dict(stored))
    monkeypatch.setattr(
        scorer, "evaluate",
        lambda *a, **k: pytest.fail("a cached read must not rescore"),
    )

    result = scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID, force=False)

    assert result["headline"] == "cached"
    # The name is never cached; it is read beside the response every time.
    assert result["candidate"]["name"] == "Priya Sharma"


def test_force_ignores_the_cache(monkeypatch):
    allow(monkeypatch)
    with_profile(monkeypatch, make_input())
    static_wording(monkeypatch)
    monkeypatch.setattr(
        scorer, "load_analysis",
        lambda *a, **k: pytest.fail("force=True must not read the cache"),
    )

    assert scorer.score_applicant(
        EMPLOYER_ID, APPLICATION_ID, force=True)["status"] == "ok"


def test_the_shortlist_never_touches_the_cache(monkeypatch):
    allow(monkeypatch)
    with_profile(monkeypatch, make_input())
    monkeypatch.setattr(
        scorer, "load_analysis",
        lambda *a, **k: pytest.fail("the shortlist recomputes, it does not cache"),
    )
    monkeypatch.setattr(
        scorer, "save_analysis",
        lambda **k: pytest.fail("the shortlist must not write a partial row"),
    )

    assert scorer.score_applicants(EMPLOYER_ID, JOB_ID)["status"] == "ok"


def test_an_applicant_with_no_resume_is_still_scored_just_not_cached(monkeypatch):
    allow(monkeypatch)
    with_profile(monkeypatch, make_input(resume=None))
    static_wording(monkeypatch)

    result = scorer.score_applicant(EMPLOYER_ID, APPLICATION_ID, force=True)

    assert result["status"] == "ok"
    assert store.save_analysis(None, CANDIDATE_ID, JOB_ID, result) is False


# -- the HTTP surface ----------------------------------------------------


def test_the_endpoints_refuse_a_request_with_no_identity(client):
    for path in ("/applicant-scores", "/ai/applicant-scores"):
        assert client.post(path, json={"job_id": JOB_ID}).status_code == 401
    for path in ("/applicant-score", "/ai/applicant-score"):
        assert client.post(
            path, json={"application_id": APPLICATION_ID}).status_code == 401


def test_the_endpoints_reject_an_id_that_is_not_a_uuid(client):
    headers = {"X-User-Id": EMPLOYER_ID}

    assert client.post("/applicant-scores", json={"job_id": "nope"},
                       headers=headers).status_code == 400
    assert client.post("/applicant-score", json={"application_id": "nope"},
                       headers=headers).status_code == 400


def test_a_candidate_id_in_the_body_is_ignored(client, monkeypatch):
    """Nothing in the body can name who gets scored."""
    seen = {}

    def record(employer_user_id, application_id, force=False):
        seen.update(employer_user_id=employer_user_id, application_id=application_id)
        return {"status": "not_found"}

    monkeypatch.setattr("app.resume_score.routes.score_applicant", record)

    client.post(
        "/applicant-score",
        json={"application_id": APPLICATION_ID,
              "user_id": "d0000000-0000-0000-0000-000000000009",
              "candidate_id": "d0000000-0000-0000-0000-000000000009"},
        headers={"X-User-Id": EMPLOYER_ID},
    )

    assert seen == {"employer_user_id": EMPLOYER_ID,
                    "application_id": APPLICATION_ID}


def test_a_refusal_comes_back_as_403_with_its_status(client, monkeypatch):
    monkeypatch.setattr(
        "app.resume_score.routes.score_applicants",
        lambda *a, **k: {"status": "not_authorised"},
    )

    res = client.post("/applicant-scores", json={"job_id": JOB_ID},
                      headers={"X-User-Id": RIVAL_EMPLOYER_ID})

    assert res.status_code == 403
    assert res.json() == {"status": "not_authorised"}


def test_a_missing_application_comes_back_as_404_with_its_status(client, monkeypatch):
    monkeypatch.setattr(
        "app.resume_score.routes.score_applicant",
        lambda *a, **k: {"status": "not_found"},
    )

    res = client.post("/applicant-score", json={"application_id": APPLICATION_ID},
                      headers={"X-User-Id": EMPLOYER_ID})

    assert res.status_code == 404
    assert res.json() == {"status": "not_found"}


def test_a_good_shortlist_request_comes_back_as_200(client, monkeypatch):
    payload = {"status": "ok", "job_id": JOB_ID,
               "scores": {APPLICATION_ID: {"score": 86, "band": "excellent",
                                           "degraded": False}}}
    monkeypatch.setattr(
        "app.resume_score.routes.score_applicants", lambda *a, **k: payload)

    res = client.post("/applicant-scores", json={"job_id": JOB_ID, "limit": 25},
                      headers={"X-User-Id": EMPLOYER_ID})

    assert res.status_code == 200
    assert res.json() == payload


# -- skills ceiling ------------------------------------------------------
#
# A total score alone called a real applicant a "Good match" (70) while they
# covered 2 of the 8 skills the job listed — experience 100 and resume 100
# carried it. For a screen an employer shortlists from, the skills bar has to
# cap what the headline is allowed to claim.

from app.resume_score.rules import band_for, _years_text


def test_strong_experience_cannot_buy_a_good_match_headline():
    # 70 would normally be "good"; 25% skills coverage holds it to "limited".
    band, headline = band_for(70, skills_pct=25)
    assert band == "needs_work"
    assert headline == "Limited match for this role"


def test_mid_coverage_is_capped_at_partial():
    band, headline = band_for(88, skills_pct=45)
    assert band == "fair"
    assert headline == "Partial match for this role"


def test_good_coverage_is_not_capped():
    assert band_for(88, skills_pct=75)[0] == "excellent"
    assert band_for(70, skills_pct=60)[0] == "good"


def test_ceiling_never_promotes_a_weak_score():
    # The ceiling may only lower a claim, never raise one.
    assert band_for(20, skills_pct=100)[0] == "needs_work"
    assert band_for(55, skills_pct=100)[0] == "fair"


def test_generic_score_has_no_ceiling():
    # No target job means no required skills to cover, so nothing to cap.
    assert band_for(88, skills_pct=None)[0] == "excellent"


def test_summary_never_contradicts_the_headline():
    from app.resume_score.rules import _summary

    assert "Misses several" in _summary("needs_work", 2, True)
    assert "nearly everything" in _summary("excellent", 0, True)


def test_career_length_reads_like_a_person_said_it():
    # total_experience_years arrives as a computed decimal; "14.08 years" is
    # false precision about someone's career.
    assert _years_text(14.08) == "14 years"
    assert _years_text(7.0) == "7 years"
    assert _years_text(1.0) == "1 year"
    assert _years_text(2.5) == "2.5 years"
    assert _years_text(0.4) == "under a year"
