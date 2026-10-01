"""Regex-first contact field extraction from raw resume text.

Emails, phone numbers, and LinkedIn/GitHub URLs are deterministically
extractable with near-100% reliability from source text. The LLM is
unreliable for these (drops emails, misfiles them as website, invents
LinkedIn URLs). This module extracts them directly from text so the merge
layer can prefer regex over LLM output.
"""

import re

_EMAIL_RE = re.compile(r"[a-zA-Z0-9][a-zA-Z0-9._%+\-]*@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

# A PDF line-wrap frequently splits an email across the domain
# ("kasimbashashaik237@gm\nail.com"). Heal a break where the tail after the
# newline completes into a real domain (has a dot + TLD), so the email regex
# can then match. The domain requirement keeps this from gluing a finished
# email to the next content line.
_WRAPPED_EMAIL_RE = re.compile(
    r"([a-zA-Z0-9._%+\-]*@[a-zA-Z0-9.\-]*)[ \t]*[\r\n]+[ \t]*"
    r"([a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*\.[a-zA-Z]{2,})"
)


def _heal_wrapped_emails(text: str) -> str:
    return _WRAPPED_EMAIL_RE.sub(lambda m: m.group(1) + m.group(2), text)

# Indian + generic international phone formats: optional +CC, separators, 10+ digits.
_PHONE_RE = re.compile(
    r"(?<!\d)(\+?\d{1,3}[\s\-.]?)?"
    r"(\(?\d{3,5}\)?[\s\-.]?)?"
    r"\d{3,4}[\s\-.]?\d{3,4}(?!\d)"
)

_LINKEDIN_RE = re.compile(
    r"(?:https?://)?(?:www\.)?linkedin\.com/(?:in|pub)/[\w\-%]+/?", re.IGNORECASE
)
_GITHUB_RE = re.compile(
    r"(?:https?://)?(?:www\.)?github\.com/[\w\-]+/?", re.IGNORECASE
)
# Curated TLD whitelist — avoids false positives on resume text that merely
# looks URL-shaped ("Pvt.Ltd", "B.Ed", "M.C.A", "in.linkedin" as a substring
# of a longer linkedin.com URL).
_KNOWN_TLDS = (
    "com", "org", "net", "io", "co", "in", "me", "info", "biz", "tech",
    "app", "xyz", "ai", "dev", "edu", "gov", "us", "uk", "ca", "au", "de",
)
_TLD_ALTERNATION = "|".join(_KNOWN_TLDS)
# Domain label requires >=3 chars so degree abbreviations don't collide with
# TLDs — "B.Tech", "M.Tech", "M.Com", "B.Com" would otherwise false-positive
# ("tech" and "com" are both real TLDs).
# Allow optional subdomain labels so "johndoe.github.io" or "portfolio.me.co"
# capture fully instead of being truncated to the last two labels.
_GENERIC_URL_RE = re.compile(
    rf"(?:https?://)?(?:www\.)?(?:[\w\-]+\.)*[\w\-]{{3,}}\.(?:{_TLD_ALTERNATION})(?:/[\w\-./?%&=]*)?",
    re.IGNORECASE,
)

# Domains that are never a "personal website" even though URL-shaped.
_NON_WEBSITE_DOMAINS = (
    "linkedin.com", "github.com", "gmail.com", "yahoo.com", "outlook.com",
    "hotmail.com", "naukri.com", "indeed.com", "gitlab.com", "bitbucket.org",
)


def _normalize_url(url: str, prefix_check: str) -> str:
    url = url.strip().rstrip("/.,;")
    if prefix_check not in url.lower():
        return ""
    if not url.lower().startswith("http"):
        url = f"https://{url}"
    return url


def extract_emails(text: str) -> list[str]:
    """Return all email addresses found in text, in order of appearance, deduped."""
    if not text:
        return []
    text = _heal_wrapped_emails(text)
    seen = set()
    out = []
    for m in _EMAIL_RE.finditer(text):
        email = m.group(0).strip().rstrip(".")
        key = email.lower()
        if key not in seen:
            seen.add(key)
            out.append(email)
    return out


def extract_primary_email(text: str) -> str:
    emails = extract_emails(text)
    return emails[0] if emails else ""


def extract_linkedin(text: str) -> str:
    if not text:
        return ""
    m = _LINKEDIN_RE.search(text)
    if not m:
        return ""
    return _normalize_url(m.group(0), "linkedin.com")


def extract_github(text: str) -> str:
    if not text:
        return ""
    m = _GITHUB_RE.search(text)
    if not m:
        return ""
    return _normalize_url(m.group(0), "github.com")


def _first_valid_phone(candidates: "re.Iterator[re.Match]") -> str:
    """Return the first candidate with a plausible phone-length digit count.
    A single regex match (e.g. a ZIP code before the real number) can fail the
    digit-count check — must keep scanning, not give up on the first miss."""
    for m in candidates:
        candidate = m.group(0).strip()
        digits = re.sub(r"\D", "", candidate)
        if 10 <= len(digits) <= 13:
            return candidate
    return ""


def extract_phone(text: str) -> str:
    """Best-effort phone extraction. Prefers a labeled match ('Phone:', 'Mobile:')
    anywhere in the document, then an unlabeled digit run in the header block,
    then falls back to scanning the full text (contact info isn't always on
    page 1 in every template)."""
    if not text:
        return ""
    # \b anchors keep "tel" from matching inside "Airtel"; the capture is kept
    # on a single line ([ \t] not \s) and validated by digit count so a labeled
    # match can't return a date range like "2015-2019".
    labeled = re.search(
        r"\b(?:phone|mobile|contact|cell|tel)\b\s*(?:no\.?|number)?\s*[:\-]?\s*(\+?[\d][\d \t\-.()]{7,})",
        text, re.IGNORECASE,
    )
    if labeled:
        candidate = labeled.group(1).strip()
        if 10 <= len(re.sub(r"\D", "", candidate)) <= 13:
            return candidate

    head_hit = _first_valid_phone(_PHONE_RE.finditer(text[:1500]))
    if head_hit:
        return head_hit

    return _first_valid_phone(_PHONE_RE.finditer(text))


def extract_website(text: str) -> str:
    """Extract a personal/portfolio website URL, excluding known non-website domains."""
    if not text:
        return ""
    for m in _GENERIC_URL_RE.finditer(text):
        url = m.group(0).strip().rstrip("/.,;")
        low = url.lower()
        if any(d in low for d in _NON_WEBSITE_DOMAINS):
            continue
        if "@" in url:
            continue
        if "." not in url:
            continue
        if not low.startswith("http"):
            url = f"https://{url}"
        return url
    return ""


def is_non_website_url(url: str) -> bool:
    """True if url belongs to linkedin/github/email/tracking domains — should never sit in `website`."""
    if not url:
        return False
    low = url.lower()
    return "@" in url or any(d in low for d in _NON_WEBSITE_DOMAINS)
