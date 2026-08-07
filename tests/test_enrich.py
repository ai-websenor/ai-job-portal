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


# ── unlabelled (PIN-anchored) address ───────────────────────────────────

def test_extract_address_pincode_anchored_no_label():
    raw = (
        "Server, VBA\n"
        "b 306, Vista Lagos Apartment, Kempapura\n"
        "Main Road\n"
        "Yemalur Bangalore 560037\n"
        "T +91 9620901704\n"
        "B someone@gmail.com\n"
    )
    addr = enrich.extract_address(raw)
    assert "Bangalore 560037" in addr
    assert "Vista Lagos Apartment" in addr
    # the code/contact lines above and below must not leak in
    assert "VBA" not in addr
    assert "+91" not in addr


def test_extract_address_pincode_requires_known_city():
    # a stray 6-digit number with no known city nearby is not an address
    raw = "Reference number 123456\nEmployee id 987654\n"
    assert enrich.extract_address(raw) == ""


# ── education date re-grounding picks the year-bearing window ────────────

def test_reground_prefers_year_window_over_prose_anchor():
    from app.models.resume import EducationalDetail
    raw = (
        "Possess good communication skills to collaborate with teams.\n"
        "EDUCATION\n"
        "2007 B. E\n"
        "(Electronics and Communication)\n"
        "First Class\n"
    )
    edu = EducationalDetail(
        degree="B. E", fieldOfStudy="Electronics and Communication",
        startDate="2001-01-01", endDate="2003-01-01",
    )
    enrich.reground_education_dates([edu], raw)
    # single passing year -> endDate=that year, startDate cleared
    assert edu.startDate is None
    assert edu.endDate == "2007-01-01"


def test_filter_skills_drops_trailing_gerund_and_curly_apostrophe():
    from app.models.resume import SkillDetail
    junk = ["Camera viewing", "Rules creating", "End user outlook configuring",
            "Software’s"]
    keep = ["Windows 10", "Network Folder management",
            "Continuous Integration and Continuous Deployment", "Node.js"]
    kept = enrich.filter_skills([SkillDetail(skillName=s) for s in junk + keep])
    assert [s.skillName for s in kept] == keep


def test_harvest_skill_names_from_experience_and_projects():
    from app.models.resume import ExperienceDetail, ProjectDetail
    exps = [ExperienceDetail(title="Dev", skillsUsed="Java, Spring / Hibernate | MongoDB and Node.js")]
    projs = [ProjectDetail(name="X", technologies="React,Redux, Managing team")]
    got = enrich.harvest_skill_names(exps, projs)
    # order-preserving, deduped, duty phrase "Managing team" dropped
    assert got == ["Java", "Spring", "Hibernate", "MongoDB", "Node.js", "React", "Redux"]


def test_harvest_skill_names_dedups_case_insensitive():
    from app.models.resume import ExperienceDetail
    exps = [
        ExperienceDetail(title="A", skillsUsed="Python, Django"),
        ExperienceDetail(title="B", skillsUsed="python, Flask"),
    ]
    assert enrich.harvest_skill_names(exps, []) == ["Python", "Django", "Flask"]


def test_harvest_skill_names_empty_when_no_tech_fields():
    from app.models.resume import ExperienceDetail
    assert enrich.harvest_skill_names([ExperienceDetail(title="A")], []) == []


def test_city_state_near_contact_ignores_work_location():
    # candidate city sits in the contact block; a work-location city in the
    # experience section must NOT be picked.
    raw = (
        "Rahul Verma\n"
        "Phone: +91 9876543210 | Pune\n"
        "PROFESSIONAL EXPERIENCE\n"
        "Acme Corp, Bangalore  Jan 2020 - Present\n"
    )
    assert enrich.city_state_near_contact(raw) == ("Pune", "Maharashtra")


def test_city_state_near_contact_blank_when_only_work_city():
    raw = (
        "Rahul Verma\n"
        "Software Engineer\n"
        "PROFESSIONAL EXPERIENCE\n"
        "Acme Corp, Bangalore  Jan 2020 - Present\n"
    )
    assert enrich.city_state_near_contact(raw) == ("", "")


def test_extract_emails_heals_pdf_line_wrap():
    from app.parser import contact_extractor as ce
    raw = "EMAIL kasimbashashaik237@gm\r\nail.com\r\nLOCATION Chennai"
    assert ce.extract_primary_email(raw) == "kasimbashashaik237@gmail.com"


def test_extract_emails_does_not_glue_complete_email_to_next_line():
    from app.parser import contact_extractor as ce
    raw = "john@example.com\r\nLOCATION Delhi"
    assert ce.extract_primary_email(raw) == "john@example.com"


# ── grade normalization ───────────────────────────────────────────────────

def test_normalize_grade_reads_explicit_units():
    assert enrich.normalize_grade("8.5 CGPA") == ("8.5", "cgpa")
    assert enrich.normalize_grade("CGPA: 8.2/10") == ("8.2", "cgpa")
    assert enrich.normalize_grade("76.5%") == ("76.5", "percentage")
    assert enrich.normalize_grade("First Class with 65%") == ("65", "percentage")
    assert enrich.normalize_grade("Percentage: 88.75") == ("88.75", "percentage")


def test_normalize_grade_infers_type_from_magnitude():
    assert enrich.normalize_grade("8.5") == ("8.5", "cgpa")
    assert enrich.normalize_grade("75") == ("75", "percentage")


def test_normalize_grade_drops_non_numeric_and_out_of_range():
    # Harish case: the LLM put a passing note where the form wants a number.
    assert enrich.normalize_grade("Passed out in 2007") == ("", "")
    assert enrich.normalize_grade("2007") == ("", "")
    assert enrich.normalize_grade("First Class") == ("", "")
    assert enrich.normalize_grade("A+") == ("", "")
    assert enrich.normalize_grade("110%") == ("", "")
    assert enrich.normalize_grade("0") == ("", "")


def test_normalize_grade_rounds_to_two_decimals():
    assert enrich.normalize_grade("8.456") == ("8.46", "cgpa")


def test_normalize_grade_declared_type_loses_to_printed_unit():
    assert enrich.normalize_grade("76.5%", "cgpa") == ("76.5", "percentage")
    assert enrich.normalize_grade("85", "percentage") == ("85", "percentage")


# ── state beside city / country from source phone ─────────────────────────

def test_state_beside_city_expands_two_letter_code():
    assert enrich.state_beside_city("Nizamabad, TS.\n+91 7989823960", "Nizamabad") == "Telangana"
    assert enrich.state_beside_city("Pune - Maharashtra", "Pune") == "Maharashtra"


def test_state_beside_city_ignores_non_state_token():
    assert enrich.state_beside_city("Nizamabad, India", "Nizamabad") == ""
    assert enrich.state_beside_city("Some text", "Nizamabad") == ""


def test_country_from_source_phone_needs_explicit_code():
    assert enrich.country_from_source_phone("Phone: +91 7989823960") == "India"
    assert enrich.country_from_source_phone("Phone: 7989823960") == ""


# ── headline recovery ─────────────────────────────────────────────────────

def test_headline_from_header_picks_title_line_under_name():
    raw = "HARISH\nCERTIFICATE\nSalesforce Developer\nCAREER OBJECTIVE\nEDUCATION"
    assert enrich.headline_from_header(raw, "Harish", "Errab") == "Salesforce Developer"


def test_headline_from_header_splits_name_and_title_on_one_line():
    raw = "Shabnam Siddiqui Sr. iOS developer\nshabnam@example.com 9104997177 Surat"
    assert enrich.headline_from_header(raw, "Shabnam", "Siddiqui") == "Sr. iOS developer"


def test_headline_from_header_blank_when_resume_states_no_title():
    raw = (
        "GAURANGSINH SOLANKI\n gaurang@example.com\n +91-9687322620\nObjective\n"
        "To excel in the work by maintaining a learning attitude.\n"
        " CROMPTON GREAVES CONSUMER ELECTRICAL LTD ( DESKTOP SUPPORT \nENGINEER)"
    )
    assert enrich.headline_from_header(raw, "Gaurangsinh", "Solanki") == ""


def test_headline_on_single_source_line_rejects_stitched_titles():
    raw = (
        "Worked as a Associate Software Engineer in Futurista Technologies.\n"
        "Worked as a Senior Associate in Wipro Limited.\n"
        "Working as a Senior Software Engineer in GEBB'S Technologies Pvt Ltd."
    )
    stitched = "Associate Software Engineer | Senior Associate | Senior Software Engineer"
    assert not enrich.headline_on_single_source_line(stitched, raw)
    assert enrich.headline_on_single_source_line("Senior Associate", raw)


# ── tech-stack field cleanup ──────────────────────────────────────────────

def test_clean_tech_list_keeps_real_stacks_untouched():
    for stack in (
        "React, Node.js, MongoDB, Express.js, AWS",
        "Java, Spring Boot, Hibernate, PostgreSQL, Docker, Kubernetes",
        "Apex Classes, Controller Classes, Triggers, Lightning Web Components",
        "Python, Django, Celery, Redis, Continuous Integration and Continuous Deployment",
    ):
        assert enrich.clean_tech_list(stack) == stack


def test_clean_tech_list_drops_responsibility_prose():
    value = (
        "Developed Triggers, Build visualforce pages, Custom objects, "
        "Testing of Developed functionalities, Design and deployed validation "
        "rules and approval process for automating business logic"
    )
    assert enrich.clean_tech_list(value) == "Custom objects"


# ── present-tense current role ────────────────────────────────────────────

def _exp(title, company, current=False):
    from app.models.resume import ExperienceDetail

    return ExperienceDetail(title=title, companyName=company, isCurrent=current)


def test_present_tense_marks_the_live_role():
    exps = [_exp("Senior Associate", "Wipro Limited"), _exp("Senior Software Engineer", "GEBB'S Technologies")]
    raw = (
        "Worked as a Senior Associate in Wipro Limited.\n"
        "Working as a Senior Software Engineer in GEBB\u2019S Technologies.\n"
    )
    enrich.mark_current_from_present_tense(exps, raw)
    assert [e.isCurrent for e in exps] == [False, True]


def test_present_tense_does_not_fire_on_past_tense_only():
    exps = [_exp("Dev", "Acme"), _exp("Dev", "Beta")]
    enrich.mark_current_from_present_tense(exps, "Worked as a Dev in Acme.\nWorked as a Dev in Beta.")
    assert [e.isCurrent for e in exps] == [False, False]


def test_present_tense_leaves_ambiguous_matches_alone():
    exps = [_exp("Dev", "Acme"), _exp("Dev", "Beta")]
    enrich.mark_current_from_present_tense(exps, "Working as a Dev in Acme and Beta.")
    assert [e.isCurrent for e in exps] == [False, False]


def test_present_tense_never_overrides_an_existing_current_flag():
    exps = [_exp("Dev", "Acme", current=True), _exp("Dev", "Beta")]
    enrich.mark_current_from_present_tense(exps, "Working as a Dev in Beta.")
    assert [e.isCurrent for e in exps] == [True, False]


# ── employment type ───────────────────────────────────────────────────────

def test_employment_type_stated_only_when_named():
    assert enrich.employment_type_stated("internship", "Software Development Internship at Acme")
    assert enrich.employment_type_stated("full_time", "Full-Time Engineer at Acme")
    assert not enrich.employment_type_stated("full_time", "Senior Associate in Wipro Limited")
