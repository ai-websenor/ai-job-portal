"""Unit tests for loss-free PDF text normalization (app.extractors.pdf)."""

from app.extractors.pdf import _clean_text


def test_strips_noncharacter_splitting_a_word():
    # U+FFFE injected mid-word ("IM<x>MIGRATION") must be removed
    assert _clean_text("IM￾MIGRATION") == "IMMIGRATION"


def test_strips_zero_width_and_soft_hyphen():
    assert _clean_text("soft­hyphen") == "softhyphen"
    assert _clean_text("a​b‌c‍d⁠e﻿") == "abcde"


def test_preserves_real_space_and_hyphen():
    assert _clean_text("MS SQL") == "MS SQL"
    assert _clean_text("React-Native") == "React-Native"


def test_still_unwraps_ligatures():
    assert _clean_text("ofﬁce") == "office"


def test_empty_input():
    assert _clean_text("") == ""
    assert _clean_text(None) is None
