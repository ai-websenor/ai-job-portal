"""Unit tests for deterministic personal-field enrichment (app.parser.enrich)."""

from app.parser import enrich


# ── phone ───────────────────────────────────────────────────────────────

def test_normalize_phone_canonical_form():
    assert enrich.normalize_phone("+91-9687322620") == "+91 9687322620"
    assert enrich.normalize_phone("+91 9620901704") == "+91 9620901704"
    assert enrich.normalize_phone("(+91) 96209 01704") == "+91 9620901704"


def test_normalize_phone_bare_ten_digits_assumed_india():
    assert enrich.normalize_phone("9494684698") == "+91 9494684698"
    assert enrich.normalize_phone("09494684698") == "+91 9494684698"
    assert enrich.normalize_phone("919494684698") == "+91 9494684698"


def test_normalize_phone_junk_returns_input():
    assert enrich.normalize_phone("") == ""
    assert enrich.normalize_phone("n/a") == "n/a"


# ── country / nationality ────────────────────────────────────────────────

def test_country_from_phone():
    assert enrich.country_from_phone("+91 9687322620") == "India"
    assert enrich.country_from_phone("+971 501234567") == "United Arab Emirates"
    assert enrich.country_from_phone("+1 4155551234") == "United States"
    assert enrich.country_from_phone("9687322620") == ""


def test_nationality_for_country():
    assert enrich.nationality_for_country("India") == "Indian"
    assert enrich.nationality_for_country("united states") == "American"
    assert enrich.nationality_for_country("Atlantis") == ""


# ── address / location ───────────────────────────────────────────────────

def test_extract_address_multiline_block():
    raw = (
        "Personal Information :\n"
        "Date of Birth : 24th Oct 1985\n"
        "Address : At & Po Uchchhad\n"
        "Vadi Faliya Ta: jambusar\n"
        "Dist : Bharuch 392150\n"
        "Languages : Gujarati, Hindi"
    )
    assert enrich.extract_address(raw) == (
        "At & Po Uchchhad, Vadi Faliya Ta: jambusar, Dist : Bharuch 392150"
    )


def test_extract_address_absent():
    assert enrich.extract_address("No labelled address here") == ""


def test_city_state_from_text():
    assert enrich.city_state_from_text("Dist : Bharuch 392150") == ("Bharuch", "Gujarat")
    assert enrich.city_state_from_text("nothing geographic") == ("", "")


# ── headline / summary ───────────────────────────────────────────────────

def test_headline_fabrication_detected_when_sentence_from_summary():
    # Gaurangsinh case: the whole objective sentence was dumped into headline.
    summary = ("Objective To excel in the work by maintaining a learning attitude "
               "more responsibilities using my skills for the growth of the organization")
    assert enrich.headline_is_fabricated("Objective " + summary[10:], summary)


def test_headline_not_fabricated_when_distinct():
    assert not enrich.headline_is_fabricated(
        "Senior QA Engineer",
        "Methodical QA professional with 7.7 years of experience.",
    )


def test_headline_short_title_kept_even_if_it_opens_summary():
    # A real short title that happens to start the summary must NOT be cleared.
    assert not enrich.headline_is_fabricated(
        "Full Stack Developer",
        "Full Stack Developer with 6+ years building scalable web apps.",
    )


def test_clean_summary_strips_label_and_newlines():
    assert enrich.clean_summary("Objective\nTo excel  in the\twork") == "To excel in the work"
    assert enrich.clean_summary("Summary: Backend engineer") == "Backend engineer"


def test_clean_summary_keeps_compound_word_starting_with_label():
    # "Profile-driven" must not lose its "Profile-" prefix.
    assert enrich.clean_summary("Profile-driven engineer with 5 years") == "Profile-driven engineer with 5 years"


# ── date normalization ───────────────────────────────────────────────────

def test_normalize_date_common_forms():
    assert enrich.normalize_date("March-2001") == "2001-03-01"
    assert enrich.normalize_date("Oct 11/2019") == "2019-10-11"
    assert enrich.normalize_date("Jan 2020") == "2020-01-01"
    assert enrich.normalize_date("07/12/2013") == "2013-12-07"
    assert enrich.normalize_date("2016") == "2016-01-01"
    assert enrich.normalize_date("2020-05-01") == "2020-05-01"


def test_normalize_date_leaves_ambiguous_and_none():
    assert enrich.normalize_date("2006-07") == "2006-07"   # academic range: don't guess
    assert enrich.normalize_date(None) is None
    assert enrich.normalize_date("") == ""


# ── education date re-grounding ──────────────────────────────────────────

def test_reground_education_year_before_degree_layout():
    from app.models.resume import EducationalDetail
    raw = (
        "EDUCATION\n"
        "2007 B. E\n(Electronics and Communication)\nFirst Class\n"
        "2003 HSC (Science)\nFirst Class\n"
        "2001 SSC\nFirst Class"
    )
    # LLM fabricated ranges by borrowing other rows' years.
    edu = [
        EducationalDetail(degree="B. E", fieldOfStudy="Electronics and Communication",
                          startDate="2001-01-01", endDate="2003-01-01"),
        EducationalDetail(degree="HSC (Science)", startDate="2003-01-01", endDate="2005-01-01"),
        EducationalDetail(degree="SSC", startDate="2001-01-01", endDate="2003-01-01"),
    ]
    enrich.reground_education_dates(edu, raw)
    assert [(e.startDate, e.endDate) for e in edu] == [
        (None, "2007-01-01"), (None, "2003-01-01"), (None, "2001-01-01"),
    ]


def test_reground_leaves_single_date_entries_untouched():
    from app.models.resume import EducationalDetail
    edu = [EducationalDetail(degree="SSC", startDate="2001-03-01", endDate=None)]
    enrich.reground_education_dates(edu, "SSC GSHEB March-2001 63%")
    assert (edu[0].startDate, edu[0].endDate) == ("2001-03-01", None)


# ── skill filtering ──────────────────────────────────────────────────────

def test_is_probable_non_skill_drops_activity_phrases():
    for junk in ["Helping team", "Implementing new network setup", "Desktop calls",
                 "Application", "Internet browser", "Recording cheking", ""]:
        assert enrich.is_probable_non_skill(junk)


def test_is_probable_non_skill_keeps_real_skills():
    for real in ["Windows 10", "AutoCAD", "MS Visio", "LAN", "VPN", "PostgreSQL",
                 "Amazon Web Services", "Node.js"]:
        assert not enrich.is_probable_non_skill(real)


def test_filter_skills_removes_only_junk():
    from app.models.resume import SkillDetail
    skills = [SkillDetail(skillName="AutoCAD"), SkillDetail(skillName="Helping team"),
              SkillDetail(skillName="LAN")]
    kept = enrich.filter_skills(skills)
    assert [s.skillName for s in kept] == ["AutoCAD", "LAN"]
