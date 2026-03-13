"""Per-section prompt templates for chunked resume processing.

Each section type gets its own focused prompt (~200-400 tokens) instead of
large combined prompts. Templates use double braces for literal JSON so
`.format(text=...)` works with the single-brace `{text}` placeholder.
"""

# ── Shared confidence preamble (injected into each prompt) ──────────────
_CONFIDENCE = """\
Confidence: 0.9-1.0 clearly stated, 0.7-0.89 inferred, 0.5-0.69 ambiguous, 0.0 not found (value=null)."""

# ─────────────────────────────────────────────────────────────────────────
# 1. PERSONAL — name, contact, summary, headline, DOB, etc.
# ─────────────────────────────────────────────────────────────────────────
PERSONAL_PROMPT = """\
You are a resume parser. Extract personal information from the resume text below. Return ONLY valid JSON, no markdown fences.

""" + _CONFIDENCE + """

## Output Schema
{{
  "personal": {{
    "name": {{"value": "full name", "confidence": 0.0}},
    "first_name": {{"value": "first/given name", "confidence": 0.0}},
    "last_name": {{"value": "last/family name", "confidence": 0.0}},
    "email": {{"value": "email or null", "confidence": 0.0}},
    "phone": {{"value": "phone with country code if visible", "confidence": 0.0}},
    "address": {{"value": "full address or null", "confidence": 0.0}},
    "city": {{"value": "city or null", "confidence": 0.0}},
    "state": {{"value": "state/province or null", "confidence": 0.0}},
    "country": {{"value": "country or null", "confidence": 0.0}},
    "linkedin": {{"value": "LinkedIn URL or null", "confidence": 0.0}},
    "github": {{"value": "GitHub URL or null", "confidence": 0.0}},
    "website": {{"value": "portfolio/personal website URL or null", "confidence": 0.0}},
    "summary": {{"value": "COMPLETE profile summary/objective or null", "confidence": 0.0}},
    "headline": {{"value": "standalone professional title line or null", "confidence": 0.0}},
    "date_of_birth": {{"value": "DOB as stated or null", "confidence": 0.0}},
    "gender": {{"value": "Male/Female/Other or null", "confidence": 0.0}},
    "nationality": {{"value": "nationality or null", "confidence": 0.0}},
    "marital_status": {{"value": "Married/Unmarried/Single or null", "confidence": 0.0}}
  }},
  "languages": [
    {{
      "name": {{"value": "language name", "confidence": 0.0}},
      "proficiency": {{"value": "Native/Fluent/Conversational/Basic or as stated", "confidence": 0.0}}
    }}
  ]
}}

## Rules
- Summary: extract COMPLETE text from "Objective", "Career Objective", "About Me", "Profile Summary", "Professional Summary", "Summary", "Profile", "Executive Summary", or the first paragraph after name/contact. Do NOT truncate. If bullet points, join ALL with "; ".
- Headline: ONLY if an explicit standalone professional title line exists (e.g., "Senior Java Developer | 8 Years Experience"). Do NOT fabricate from summary. If none, value=null, confidence=0.0.
- LinkedIn: if URL appears without https prefix, reconstruct as "https://linkedin.com/in/username".
- Name splitting: "Prashant Kumar Gupta" = first_name "Prashant", last_name "Kumar Gupta".
- Languages (spoken/written): if "Languages Known", "Languages Spoken", etc. appears, extract each language. Map proficiency if stated. These are human languages (English, Hindi, Marathi), NOT programming languages.
- Missing fields: value=null, confidence=0.0.

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 2. EXPERIENCE — work history entries
# ─────────────────────────────────────────────────────────────────────────
EXPERIENCE_PROMPT = """\
You are a resume parser. Extract work experience and project entries from the resume text below. Return ONLY valid JSON, no markdown fences.

""" + _CONFIDENCE + """

## Output Schema
{{
  "experience": [
    {{
      "company": {{"value": "company name", "confidence": 0.0}},
      "role": {{"value": "job title from 'Role:' line", "confidence": 0.0}},
      "location": {{"value": "geographic place (city/state/country) — NOT a date", "confidence": 0.0}},
      "start_date": {{"value": "YYYY-MM or null", "confidence": 0.0}},
      "end_date": {{"value": "YYYY-MM or Present or null", "confidence": 0.0}},
      "description": {{"value": "ALL bullet points joined by '; '", "confidence": 0.0}},
      "skills_used": ["skill1", "skill2"]
    }}
  ],
  "projects": [
    {{
      "name": {{"value": "project name", "confidence": 0.0}},
      "client": {{"value": "company or client name", "confidence": 0.0}},
      "role": {{"value": "role from 'Role:' line", "confidence": 0.0}},
      "description": {{"value": "project description text", "confidence": 0.0}},
      "responsibilities": {{"value": "ALL bullet points joined by '; '", "confidence": 0.0}},
      "technologies": {{"value": "comma-separated tech from 'Tech Stack:' line", "confidence": 0.0}},
      "url": {{"value": null, "confidence": 0.0}}
    }}
  ]
}}

## Rules
- Dates: use YYYY-MM format. "Jan 2020" = "2020-01". Year only = "YYYY-01". "Till Date"/"Till Now"/"Current"/"Ongoing" = "Present".
- Location: MUST be a geographic place. NEVER put dates or "Present" in location.
- Description: extract ALL bullet points, ALL responsibilities. Join ALL with "; ". Do NOT summarize or omit. Even 10+ points = include ALL.
- skills_used: from "Tech Stack:", "Environment:", "Technologies:", "Tools Used:" labels, or technologies mentioned in bullets. Empty array [] if none.
- List entries in reverse chronological order (most recent first).

### What goes in experience[] vs projects[]
CRITICAL: Every entry that has its OWN date range is an EXPERIENCE entry, even without a company name. Examples:
- "FinOps Lead, Big EdTech Company | Jan 2025 – Sept 2025" → EXPERIENCE (company = "Big EdTech Company")
- "Senior Ruby on Rails Consultant (July 2023 – Present)" → EXPERIENCE (no company → company = "Consulting")
- "Backend Engineer (August 2022 – July 2023)" → EXPERIENCE (no company → company = null)
- "DevOps Consultant, (Client) | June 2025 – Sept 2025" → EXPERIENCE (company = "(Client)")

NEVER skip an entry just because it lacks a company name. If no company is mentioned, set company value to null. If the role says "Consultant" or "Freelance", set company to "Consulting" or "Freelance".

projects[] is ONLY for embedded "Project: X" blocks that appear INSIDE a company's section WITHOUT their own date range. Example:
```
Company A  Sep 2024 - Present  ← experience entry
  Project: X, Role: Y, Tech Stack: Z  ← project entry (no own dates)
  Project: W, Role: Y, Tech Stack: Z  ← project entry (no own dates)
```

### Company-Project Association (for embedded projects only)
When companies are listed with dates FIRST, then "Project: X" blocks separately below WITHOUT their own dates:
1. Create ONE experience entry per project, using the project's Role, Tech Stack, and bullets.
2. Assign projects to companies by chronological order.
3. Use the company's start_date and end_date for that experience entry.
4. Also add each "Project: X" block to the projects[] array.

### Role extraction
- The role is the job title on the same line as the company name (e.g., "Cloud Head and AI & DevOps Expert, Linearloop" → role = "Cloud Head and AI & DevOps Expert").
- Also look for "Role:", "Designation:", "Position:" lines in project details.
- NEVER return "Not specified". If no explicit role, infer from context.

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 3. EDUCATION
# ─────────────────────────────────────────────────────────────────────────
EDUCATION_PROMPT = """\
You are a resume parser. Extract education entries from the resume text below. Return ONLY valid JSON, no markdown fences.

""" + _CONFIDENCE + """

## Output Schema
{{
  "education": [
    {{
      "institution": {{"value": "school/college/university name", "confidence": 0.0}},
      "degree": {{"value": "degree name (B.Tech, MCA, MBA, etc.)", "confidence": 0.0}},
      "field": {{"value": "field of study or null", "confidence": 0.0}},
      "year": {{"value": "graduation year YYYY or null", "confidence": 0.0}},
      "grade": {{"value": "CGPA/percentage/marks as stated, or null", "confidence": 0.0}},
      "description": {{"value": "additional details, thesis, activities, or null", "confidence": 0.0}}
    }}
  ]
}}

## Rules
- List in reverse chronological order. Dates as YYYY.
- Include all degrees: B.Tech, MCA, MBA, 12th, 10th, Diploma, etc.

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 4. SKILLS
# ─────────────────────────────────────────────────────────────────────────
SKILLS_PROMPT = """\
You are a resume parser. Extract individual skills from the resume text below. Return ONLY valid JSON, no markdown fences.

""" + _CONFIDENCE + """

## Output Schema
{{
  "skills": [
    {{"value": "individual skill name", "confidence": 0.0}}
  ],
  "languages": [
    {{
      "name": {{"value": "language name", "confidence": 0.0}},
      "proficiency": {{"value": "Native/Fluent/Conversational/Basic or null", "confidence": 0.0}}
    }}
  ]
}}

## Rules
- Extract INDIVIDUAL skills, not categories. "Languages: Python, Java" = two entries: "Python", "Java".
- Split compound lists. "HTML/CSS/JavaScript" = 3 entries.
- Include technical skills, tools, frameworks, methodologies.
- Confidence 0.9+ for clearly listed skills.
- Spoken/human languages: if "Languages: English, Hindi" or similar appears, put these in the "languages" array (NOT in skills). These are human languages, not programming languages. If no human languages found, return empty array.

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 5. CERTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────
CERTIFICATIONS_PROMPT = """\
You are a resume parser. Extract certifications from the resume text below. Return ONLY valid JSON, no markdown fences.

""" + _CONFIDENCE + """

## Output Schema
{{
  "certifications": [
    {{
      "name": {{"value": "certification name", "confidence": 0.0}},
      "issuer": {{"value": "issuing organization", "confidence": 0.0}},
      "year": {{"value": "YYYY or null", "confidence": 0.0}}
    }}
  ]
}}

## Rules
- Include all professional certifications, courses, licenses.
- If issuer not stated, value=null.

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 6. PROJECTS
# ─────────────────────────────────────────────────────────────────────────
PROJECTS_PROMPT = """\
You are a resume parser. Extract project entries from the resume text below. Return ONLY valid JSON, no markdown fences.

""" + _CONFIDENCE + """

## Output Schema
{{
  "projects": [
    {{
      "name": {{"value": "project name", "confidence": 0.0}},
      "client": {{"value": "client or company name, or null", "confidence": 0.0}},
      "role": {{"value": "candidate's role in the project, or null", "confidence": 0.0}},
      "description": {{"value": "what the project does — brief overview", "confidence": 0.0}},
      "responsibilities": {{"value": "candidate's responsibilities joined by '; ', or null", "confidence": 0.0}},
      "technologies": {{"value": "comma-separated tech stack used", "confidence": 0.0}},
      "url": {{"value": "project URL or null", "confidence": 0.0}}
    }}
  ]
}}

## Rules
- Extract from "Projects", "Key Projects", "Academic Projects", "Side Projects" sections.
- Do NOT include work experience entries here.
- Bullet points in responsibilities: join ALL with "; ".

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 7. ACHIEVEMENTS
# ─────────────────────────────────────────────────────────────────────────
ACHIEVEMENTS_PROMPT = """\
You are a resume parser. Extract achievements/awards from the resume text below. Return ONLY valid JSON, no markdown fences.

""" + _CONFIDENCE + """

## Output Schema
{{
  "achievements": [
    {{
      "title": {{"value": "achievement description", "confidence": 0.0}},
      "year": {{"value": "YYYY or null", "confidence": 0.0}}
    }}
  ]
}}

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 8. PUBLICATIONS
# ─────────────────────────────────────────────────────────────────────────
PUBLICATIONS_PROMPT = """\
You are a resume parser. Extract publications from the resume text below. Return ONLY valid JSON, no markdown fences.

""" + _CONFIDENCE + """

## Output Schema
{{
  "publications": [
    {{
      "title": {{"value": "publication/paper title", "confidence": 0.0}},
      "publisher": {{"value": "journal/conference name", "confidence": 0.0}},
      "year": {{"value": "YYYY or null", "confidence": 0.0}},
      "url": {{"value": "URL or null", "confidence": 0.0}}
    }}
  ]
}}

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 9. LANGUAGES
# ─────────────────────────────────────────────────────────────────────────
LANGUAGES_PROMPT = """\
You are a resume parser. Extract spoken/written languages from the resume text below. Return ONLY valid JSON, no markdown fences.

""" + _CONFIDENCE + """

## Output Schema
{{
  "languages": [
    {{
      "name": {{"value": "language name", "confidence": 0.0}},
      "proficiency": {{"value": "Native/Fluent/Conversational/Basic or as stated", "confidence": 0.0}}
    }}
  ]
}}

## Rules
- Map proficiency to Native/Fluent/Conversational/Basic if not explicitly stated.
- If proficiency not mentioned, infer or set to null.

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 10. HOBBIES
# ─────────────────────────────────────────────────────────────────────────
HOBBIES_PROMPT = """\
You are a resume parser. Extract hobbies and interests from the resume text below. Return ONLY valid JSON, no markdown fences.

""" + _CONFIDENCE + """

## Output Schema
{{
  "hobbies": [
    {{"value": "hobby or interest", "confidence": 0.0}}
  ]
}}

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 11. DECLARATION
# ─────────────────────────────────────────────────────────────────────────
DECLARATION_PROMPT = """\
You are a resume parser. Extract the declaration/affirmation statement from the resume text below. Return ONLY valid JSON, no markdown fences.

## Output Schema
{{
  "declaration": {{"value": "full declaration text or null", "confidence": 0.0}}
}}

## Resume Text
{text}"""


# ── Prompt registry + builder ───────────────────────────────────────────

_PROMPTS = {
    "personal": PERSONAL_PROMPT,
    "experience": EXPERIENCE_PROMPT,
    "education": EDUCATION_PROMPT,
    "skills": SKILLS_PROMPT,
    "certifications": CERTIFICATIONS_PROMPT,
    "projects": PROJECTS_PROMPT,
    "achievements": ACHIEVEMENTS_PROMPT,
    "publications": PUBLICATIONS_PROMPT,
    "languages": LANGUAGES_PROMPT,
    "hobbies": HOBBIES_PROMPT,
    "declaration": DECLARATION_PROMPT,
}


def build_section_prompt(section_type: str, text: str) -> str:
    """Build a focused extraction prompt for the given section type."""
    template = _PROMPTS.get(section_type)
    if not template:
        raise ValueError(f"Unknown section type: {section_type}")
    return template.format(text=text)
