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


# ── gender ───────────────────────────────────────────────────────────────

def test_guess_gender_conservative():
    assert enrich.guess_gender("Gaurangsinh") == "Male"
    assert enrich.guess_gender("Priya") == "Female"
    assert enrich.guess_gender("Zxqwe") == ""   # unknown → empty, never guess
    assert enrich.guess_gender("") == ""


# ── headline / summary ───────────────────────────────────────────────────

def test_headline_fabrication_detected_when_prefix_of_summary():
    assert enrich.headline_is_fabricated(
        "Objective To excel in the work",
        "Objective\nTo excel in the work by maintaining a learning attitude",
    )


def test_headline_not_fabricated_when_distinct():
    assert not enrich.headline_is_fabricated(
        "Senior QA Engineer",
        "Methodical QA professional with 7.7 years of experience.",
    )


def test_clean_summary_strips_label_and_newlines():
    assert enrich.clean_summary("Objective\nTo excel  in the\twork") == "To excel in the work"
    assert enrich.clean_summary("Summary: Backend engineer") == "Backend engineer"


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
