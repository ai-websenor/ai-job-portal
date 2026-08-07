"""Static India city → state lookup, plus state name/abbreviation resolution.

The LLM frequently extracts city but drops state for well-known Indian cities
even though state is trivially derivable. This is a deterministic fallback
applied post-merge only when state is empty.

Indian resumes also routinely write the state as a two-letter code next to the
city ("Nizamabad, TS."), which `normalize_state` expands to the full name so a
derived state is comparable with whatever the LLM emitted.
"""

import re

# Major Indian cities → state. Keys are lowercase, punctuation-stripped.
_CITY_TO_STATE: dict[str, str] = {
    # Tamil Nadu
    "chennai": "Tamil Nadu", "madurai": "Tamil Nadu", "coimbatore": "Tamil Nadu",
    "trichy": "Tamil Nadu", "tiruchirappalli": "Tamil Nadu", "salem": "Tamil Nadu",
    "tirunelveli": "Tamil Nadu", "erode": "Tamil Nadu", "vellore": "Tamil Nadu",
    # Karnataka
    "bangalore": "Karnataka", "bengaluru": "Karnataka", "mysore": "Karnataka",
    "mysuru": "Karnataka", "mangalore": "Karnataka", "hubli": "Karnataka",
    # Maharashtra
    "mumbai": "Maharashtra", "pune": "Maharashtra", "nagpur": "Maharashtra",
    "nashik": "Maharashtra", "thane": "Maharashtra", "aurangabad": "Maharashtra",
    "navi mumbai": "Maharashtra",
    # Telangana / Andhra Pradesh
    "hyderabad": "Telangana", "secunderabad": "Telangana", "warangal": "Telangana",
    "nizamabad": "Telangana", "karimnagar": "Telangana", "khammam": "Telangana",
    "ramagundam": "Telangana", "mahbubnagar": "Telangana", "nalgonda": "Telangana",
    "adilabad": "Telangana", "siddipet": "Telangana", "suryapet": "Telangana",
    "sangareddy": "Telangana", "nirmal": "Telangana", "miryalaguda": "Telangana",
    "visakhapatnam": "Andhra Pradesh", "vizag": "Andhra Pradesh", "vijayawada": "Andhra Pradesh",
    "guntur": "Andhra Pradesh", "tirupati": "Andhra Pradesh", "nellore": "Andhra Pradesh",
    "kakinada": "Andhra Pradesh", "rajahmundry": "Andhra Pradesh", "kurnool": "Andhra Pradesh",
    "anantapur": "Andhra Pradesh", "kadapa": "Andhra Pradesh",
    # Delhi NCR
    "delhi": "Delhi", "new delhi": "Delhi", "gurgaon": "Haryana", "gurugram": "Haryana",
    "noida": "Uttar Pradesh", "faridabad": "Haryana", "ghaziabad": "Uttar Pradesh",
    # West Bengal
    "kolkata": "West Bengal", "howrah": "West Bengal", "durgapur": "West Bengal",
    # Gujarat
    "ahmedabad": "Gujarat", "surat": "Gujarat", "vadodara": "Gujarat", "baroda": "Gujarat",
    "rajkot": "Gujarat", "gandhinagar": "Gujarat", "bharuch": "Gujarat",
    # Rajasthan
    "jaipur": "Rajasthan", "jodhpur": "Rajasthan", "udaipur": "Rajasthan", "kota": "Rajasthan",
    # Uttar Pradesh
    "lucknow": "Uttar Pradesh", "kanpur": "Uttar Pradesh", "agra": "Uttar Pradesh",
    "varanasi": "Uttar Pradesh", "meerut": "Uttar Pradesh", "allahabad": "Uttar Pradesh",
    "prayagraj": "Uttar Pradesh",
    # Kerala
    "kochi": "Kerala", "cochin": "Kerala", "thiruvananthapuram": "Kerala",
    "trivandrum": "Kerala", "kozhikode": "Kerala", "calicut": "Kerala",
    # Punjab / Haryana / Chandigarh
    "chandigarh": "Chandigarh", "ludhiana": "Punjab", "amritsar": "Punjab",
    "jalandhar": "Punjab", "mohali": "Punjab",
    # Madhya Pradesh
    "bhopal": "Madhya Pradesh", "indore": "Madhya Pradesh", "gwalior": "Madhya Pradesh",
    "jabalpur": "Madhya Pradesh",
    # Bihar / Jharkhand
    "patna": "Bihar", "ranchi": "Jharkhand", "jamshedpur": "Jharkhand", "dhanbad": "Jharkhand",
    # Odisha
    "bhubaneswar": "Odisha", "cuttack": "Odisha",
    # Assam / Northeast
    "guwahati": "Assam",
    # Union territories / others
    "pondicherry": "Puducherry", "puducherry": "Puducherry",
    "panaji": "Goa", "goa": "Goa",
}


def lookup_state(city: str) -> str:
    """Return the Indian state for a known city, or "" if not found."""
    if not city:
        return ""
    key = city.strip().lower()
    return _CITY_TO_STATE.get(key, "")


# ── state name / abbreviation resolution ───────────────────────────────────

# Canonical Indian state & union-territory names, keyed by the forms resumes
# actually print: the full name plus the postal/vehicle two-letter code.
_STATE_ALIASES: dict[str, str] = {
    "ap": "Andhra Pradesh", "andhra pradesh": "Andhra Pradesh",
    "ar": "Arunachal Pradesh", "arunachal pradesh": "Arunachal Pradesh",
    "as": "Assam", "assam": "Assam",
    "br": "Bihar", "bihar": "Bihar",
    "cg": "Chhattisgarh", "ct": "Chhattisgarh", "chhattisgarh": "Chhattisgarh",
    "ga": "Goa", "goa": "Goa",
    "gj": "Gujarat", "gujarat": "Gujarat",
    "hr": "Haryana", "haryana": "Haryana",
    "hp": "Himachal Pradesh", "himachal pradesh": "Himachal Pradesh",
    "jh": "Jharkhand", "jharkhand": "Jharkhand",
    "ka": "Karnataka", "karnataka": "Karnataka",
    "kl": "Kerala", "kerala": "Kerala",
    "mp": "Madhya Pradesh", "madhya pradesh": "Madhya Pradesh",
    "mh": "Maharashtra", "maharashtra": "Maharashtra",
    "mn": "Manipur", "manipur": "Manipur",
    "ml": "Meghalaya", "meghalaya": "Meghalaya",
    "mz": "Mizoram", "mizoram": "Mizoram",
    "nl": "Nagaland", "nagaland": "Nagaland",
    "od": "Odisha", "or": "Odisha", "odisha": "Odisha", "orissa": "Odisha",
    "pb": "Punjab", "punjab": "Punjab",
    "rj": "Rajasthan", "rajasthan": "Rajasthan",
    "sk": "Sikkim", "sikkim": "Sikkim",
    "tn": "Tamil Nadu", "tamil nadu": "Tamil Nadu", "tamilnadu": "Tamil Nadu",
    "ts": "Telangana", "tg": "Telangana", "telangana": "Telangana",
    "tr": "Tripura", "tripura": "Tripura",
    "up": "Uttar Pradesh", "uttar pradesh": "Uttar Pradesh",
    "uk": "Uttarakhand", "ut": "Uttarakhand", "uttarakhand": "Uttarakhand",
    "wb": "West Bengal", "west bengal": "West Bengal",
    "dl": "Delhi", "delhi": "Delhi", "new delhi": "Delhi",
    "ch": "Chandigarh", "chandigarh": "Chandigarh",
    "py": "Puducherry", "puducherry": "Puducherry", "pondicherry": "Puducherry",
    "jk": "Jammu and Kashmir", "jammu and kashmir": "Jammu and Kashmir",
    "la": "Ladakh", "ladakh": "Ladakh",
    "an": "Andaman and Nicobar Islands",
    "dn": "Dadra and Nagar Haveli and Daman and Diu",
    "ld": "Lakshadweep", "lakshadweep": "Lakshadweep",
}

# Two-letter codes that are also ordinary English words / common abbreviations.
# Expanding these from bare prose would misread "or"/"as"/"in" as a state, so
# they resolve only in an explicit "City, XX" position (see resolve_state_token).
_AMBIGUOUS_STATE_CODES = {"as", "or", "ch", "la", "an", "up", "ga", "ml", "sk"}


def normalize_state(value: str) -> str:
    """Canonicalize a state name or two-letter code ('TS.', 'telangana') to its
    full name, or "" when it names no Indian state/UT."""
    if not value:
        return ""
    key = re.sub(r"[^a-z ]", "", value.strip().lower())
    key = re.sub(r"\s+", " ", key).strip()
    return _STATE_ALIASES.get(key, "")


def resolve_state_token(token: str, positional: bool) -> str:
    """Resolve a token found next to a city into a full state name.

    `positional` marks a token taken from an explicit "City, XX" slot — only
    there is a word-shaped code like "AS" or "OR" safely a state rather than
    English prose."""
    resolved = normalize_state(token)
    if not resolved:
        return ""
    key = re.sub(r"[^a-z]", "", token.strip().lower())
    if len(key) == 2 and key in _AMBIGUOUS_STATE_CODES and not positional:
        return ""
    return resolved
