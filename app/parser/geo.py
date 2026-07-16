"""Static India city → state lookup.

The LLM frequently extracts city but drops state for well-known Indian cities
even though state is trivially derivable. This is a deterministic fallback
applied post-merge only when state is empty.
"""

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
    "visakhapatnam": "Andhra Pradesh", "vizag": "Andhra Pradesh", "vijayawada": "Andhra Pradesh",
    "guntur": "Andhra Pradesh", "tirupati": "Andhra Pradesh",
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


def infer_country_from_city(city: str) -> str:
    """Return "India" if city is a recognized Indian city, else ""."""
    return "India" if lookup_state(city) else ""
