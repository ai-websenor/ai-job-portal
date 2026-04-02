"""Per-section prompt templates for chunked resume processing.

Each section type gets its own focused prompt. Templates use double braces
for literal JSON so `.format(text=...)` works with the single-brace
`{text}` placeholder.

Output format matches the onboarding form schema directly — no confidence
scores, flat fields, YYYY-MM-DD dates, form-compatible field names.
"""

# ─────────────────────────────────────────────────────────────────────────
# 1. PERSONAL — headline, summary, location, plus spoken languages
# ─────────────────────────────────────────────────────────────────────────
PERSONAL_PROMPT = """\
You are a resume parser. Extract personal information from the resume text below. Return ONLY valid JSON, no markdown fences.

## Output Schema
{{
  "personalDetails": {{
    "firstName": "first/given name or empty string",
    "lastName": "last/family name or empty string",
    "phone": "phone with country code if visible, or empty string",
    "headline": "standalone professional title line or empty string",
    "professionalSummary": "COMPLETE profile summary/objective or empty string",
    "country": "country or empty string",
    "state": "state/province or empty string",
    "city": "city or empty string",
    "linkedin": "LinkedIn URL or empty string",
    "github": "GitHub URL or empty string",
    "website": "portfolio/personal website URL or empty string",
    "gender": "Male or Female or Other or empty string"
  }},
  "languages": [
    {{
      "name": "language name (English, Hindi, etc.)",
      "proficiency": "Native/Fluent/Conversational/Basic or as stated"
    }}
  ]
}}

## CRITICAL — Empty Field Rules
- NEVER return "N/A", "Not Specified", "Not Available", "Not Mentioned", "None", "Unknown", "Nil", "-", or "--" for ANY field.
- If information is not found, use empty string "" for text fields. Use null ONLY for date fields.
- This applies to ALL fields without exception.

## Rules
- Name splitting: "Prashant Kumar Gupta" → firstName "Prashant", lastName "Kumar Gupta". If only one name, put it in firstName, lastName = "".
- Phone: include country code if visible. If not found, set to "".
- LinkedIn: look for URLs containing "linkedin.com/in/" anywhere in the resume. ALWAYS prefix with "https://" if missing. "linkedin.com/in/username" → "https://linkedin.com/in/username". If not found, set to "".
- GitHub: look for URLs containing "github.com/" anywhere in resume. ALWAYS prefix with "https://" if missing. If not found, set to "".
- Website: look for portfolio/personal website URLs. If not found, set to "".
- Gender: extract if explicitly stated (Male/Female/Other). Common in Indian resumes. If not found, set to "".
- Summary: extract COMPLETE text from "Objective", "Career Objective", "About Me", "Profile Summary", "Professional Summary", "Summary", "Profile", "Executive Summary", "Carrier Objective" (misspelling), or the first paragraph after name/contact. Do NOT truncate. If bullet points, join ALL with "; ".
- Headline: ONLY if an explicit standalone professional title line exists (e.g., "Senior Java Developer | 8 Years Experience"). Do NOT fabricate from summary. If none, set to empty string "".
- Location: extract city, state, country SEPARATELY from address. If "Bangalore, Karnataka" → city: "Bangalore", state: "Karnataka", country: "India" (infer if obvious). If only city visible, set state/country to "".
- Languages (spoken/written): extract each language. Map proficiency if stated. These are HUMAN languages (English, Hindi), NOT programming languages.
- Missing fields: use empty string "" for text fields. Do NOT use null for string fields.

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 2. EXPERIENCE — work history entries
# ─────────────────────────────────────────────────────────────────────────
EXPERIENCE_PROMPT = """\
You are a resume parser. Extract work experience and project entries from the resume text below. Return ONLY valid JSON, no markdown fences.

## Output Schema
{{
  "experienceDetails": [
    {{
      "title": "job title/role",
      "designation": "same as title unless resume explicitly distinguishes",
      "companyName": "company name",
      "employmentType": "full_time or part_time or contract or internship or freelance",
      "location": "geographic place (city/state/country) — NOT a date",
      "startDate": "YYYY-MM-DD or null",
      "endDate": "YYYY-MM-DD or null",
      "isCurrent": false,
      "description": "responsibilities text joined by '; '",
      "achievements": "quantified results/achievements joined by '; ' or empty string",
      "skillsUsed": "comma-separated tech/tools or empty string"
    }}
  ],
  "projects": [
    {{
      "name": "project name",
      "description": "what the project does — brief overview",
      "technologies": "comma-separated tech stack",
      "url": "project URL or empty string"
    }}
  ]
}}

## CRITICAL — Empty Field Rules
- NEVER return "N/A", "Not Specified", "Not Available", "Not Mentioned", "None", "Unknown", "Nil", "-", or "--" for ANY field.
- If information is not found, use empty string "" for text fields. Use null ONLY for date fields.
- Do NOT duplicate experience entries. Each job/role should appear exactly ONCE.

## Rules
- Dates: use YYYY-MM-DD format. "Jan 2020" = "2020-01-01". Year only → use the actual year, e.g. "2020" = "2020-01-01". Day unknown = use 01. NEVER return literal "YYYY-01-01".
- If currently employed: set isCurrent=true, endDate=null. "Till Date"/"Till Now"/"Current"/"Ongoing"/"Present" all mean isCurrent=true.
- If end_date clearly visible: extract it as YYYY-MM-DD, isCurrent=false.
- Location: MUST be a geographic place. NEVER put dates or "Present" in location. If not found, use "".
- employmentType: infer from context. "Intern" → "internship", "Freelance"/"Consultant" → "freelance", "Contract" → "contract", "Part-time" → "part_time". Default "full_time".
- description: extract responsibilities/duties. Join ALL bullet points with "; ". Do NOT summarize or omit. Even 10+ points = include ALL. If no description found, use "".
- achievements: extract quantified results separately (e.g., "Reduced latency by 40%", "Led team of 5"). Do NOT duplicate content already in description. Join with "; ". If no clear achievements, use empty string "".
- skillsUsed: from "Tech Stack:", "Environment:", "Technologies:", "Tools Used:" labels, or tech mentioned in bullets. Comma-separated string. Empty string "" if none.
- title and designation: set both to the same job title value.
- List entries in reverse chronological order (most recent first).
- Missing string fields: use empty string "". Missing dates: use null.

### What goes in experienceDetails[] vs projects[]
CRITICAL: Every entry that has its OWN date range is an EXPERIENCE entry, even without a company name.
- "FinOps Lead, Big EdTech Company | Jan 2025 - Sept 2025" → EXPERIENCE
- "Senior Ruby on Rails Consultant (July 2023 - Present)" → EXPERIENCE (no company → companyName = "Consulting")
- NEVER skip an entry because it lacks a company name. If no company, set companyName to "".

projects[] is ONLY for embedded "Project: X" blocks inside a company section WITHOUT their own date range.

### Role extraction
- The role/title is the job title on the same line as the company name.
- Also look for "Role:", "Designation:", "Position:" lines.
- If role not explicit, infer from context. Use "" if truly impossible to determine.

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 3. EDUCATION
# ─────────────────────────────────────────────────────────────────────────
EDUCATION_PROMPT = """\
You are a resume parser. Extract education entries from the resume text below. Return ONLY valid JSON, no markdown fences.

## Output Schema
{{
  "educationalDetails": [
    {{
      "degree": "degree name (B.Tech, MCA, MBA, 12th, 10th, etc.)",
      "institution": "school/college/university name",
      "fieldOfStudy": "field of study or empty string",
      "startDate": "YYYY-MM-DD or null",
      "endDate": "YYYY-MM-DD or null",
      "grade": "CGPA/percentage/marks as stated, or empty string",
      "currentlyStudying": false
    }}
  ]
}}

## CRITICAL — Empty Field Rules
- NEVER return "N/A", "Not Specified", "Not Available", "None", "Unknown". Use empty string "" instead.

## Rules
- Dates: YYYY-MM-DD format. Year only → use actual year e.g. "2020" = "2020-01-01". NEVER return literal "YYYY-01-01". If only graduation year, use it as endDate.
- If currently studying: set currentlyStudying=true, endDate=null.
- If only one year visible (graduation year), set it as endDate, startDate=null.
- List in reverse chronological order (most recent first).
- Include all degrees: B.Tech, MCA, MBA, 12th, 10th, Diploma, etc.
- Missing string fields: use empty string "". Missing dates: use null.

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 4. SKILLS
# ─────────────────────────────────────────────────────────────────────────
SKILLS_PROMPT = """\
You are a resume parser. Extract individual skills from the resume text below. Return ONLY valid JSON, no markdown fences.

## Output Schema
{{
  "skills": [
    {{
      "skillName": "individual skill name",
      "proficiencyLevel": "beginner or intermediate or advanced or expert",
      "yearsOfExperience": null
    }}
  ],
  "languages": [
    {{
      "name": "language name (English, Hindi, etc.)",
      "proficiency": "Native/Fluent/Conversational/Basic or as stated"
    }}
  ]
}}

## CRITICAL — Empty Field Rules
- NEVER return "N/A", "Not Specified", "Not Available", "None", "Unknown" for any field.
- proficiencyLevel MUST be one of: "beginner", "intermediate", "advanced", "expert". Default = "intermediate". NEVER leave empty or use other values.

## Rules
- Extract INDIVIDUAL skills, not categories. "Languages: Python, Java" = two entries.
- Split compound lists. "HTML/CSS/JavaScript" = 3 entries.
- Include technical skills, tools, frameworks, methodologies.
- proficiencyLevel: infer from context. "expert in Python" → "expert". 5+ years → "expert". 3-5 years → "advanced". 1-3 years → "intermediate". <1 year → "beginner". If no context, default "intermediate".
- yearsOfExperience: extract if explicitly stated (e.g., "5+ years of Java"). Otherwise null.
- Spoken/human languages: if "Languages: English, Hindi" appears, put in "languages" array, NOT in skills. Programming languages go in skills.
- If no human languages found, return empty languages array.

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 5. CERTIFICATIONS
# ─────────────────────────────────────────────────────────────────────────
CERTIFICATIONS_PROMPT = """\
You are a resume parser. Extract certifications from the resume text below. Return ONLY valid JSON, no markdown fences.

## Output Schema
{{
  "certifications": [
    {{
      "name": "certification name",
      "issuingOrganization": "issuing organization or empty string",
      "issueDate": "YYYY-MM-DD or null",
      "expiryDate": null,
      "credentialId": "",
      "credentialUrl": ""
    }}
  ]
}}

## CRITICAL — Empty Field Rules
- NEVER return "N/A", "Not Specified", "Not Available", "None", "Unknown". Use empty string "" instead.

## Rules
- Include all professional certifications, courses, licenses.
- Dates: YYYY-MM-DD format. Year only → use actual year e.g. "2020" = "2020-01-01". NEVER return literal "YYYY-01-01". If date not found, use null.
- If issuer not stated, use empty string "".
- expiryDate: null unless explicitly stated.
- credentialId and credentialUrl: extract if visible, otherwise empty string "".

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 6. PROJECTS
# ─────────────────────────────────────────────────────────────────────────
PROJECTS_PROMPT = """\
You are a resume parser. Extract project entries from the resume text below. Return ONLY valid JSON, no markdown fences.

## Output Schema
{{
  "projects": [
    {{
      "name": "project name",
      "description": "what the project does — brief overview",
      "technologies": "comma-separated tech stack used",
      "url": "project URL or empty string"
    }}
  ]
}}

## Rules
- Extract from "Projects", "Key Projects", "Academic Projects", "Side Projects" sections.
- Do NOT include work experience entries here.
- Bullet points in description: join ALL with "; ".
- Missing fields: use empty string "".

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 7. ACHIEVEMENTS (not in onboarding form, extracted for completeness)
# ─────────────────────────────────────────────────────────────────────────
ACHIEVEMENTS_PROMPT = """\
You are a resume parser. Extract achievements/awards from the resume text below. Return ONLY valid JSON, no markdown fences.

## Output Schema
{{
  "achievements": [
    {{
      "title": "achievement description",
      "year": "YYYY or null"
    }}
  ]
}}

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 8. PUBLICATIONS (not in onboarding form, extracted for completeness)
# ─────────────────────────────────────────────────────────────────────────
PUBLICATIONS_PROMPT = """\
You are a resume parser. Extract publications from the resume text below. Return ONLY valid JSON, no markdown fences.

## Output Schema
{{
  "publications": [
    {{
      "title": "publication/paper title",
      "publisher": "journal/conference name",
      "year": "YYYY or null",
      "url": "URL or null"
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

## Output Schema
{{
  "languages": [
    {{
      "name": "language name (English, Hindi, etc.)",
      "proficiency": "Native/Fluent/Conversational/Basic or as stated"
    }}
  ]
}}

## CRITICAL — Empty Field Rules
- NEVER return "N/A", "Not Specified", "Not Available", "None", "Unknown". Use empty string "" instead.

## Rules
- These are HUMAN languages, not programming languages.
- Map proficiency to Native/Fluent/Conversational/Basic if not explicitly stated.
- If proficiency not mentioned, infer or set to empty string "".

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 10. HOBBIES (not in onboarding form, extracted for completeness)
# ─────────────────────────────────────────────────────────────────────────
HOBBIES_PROMPT = """\
You are a resume parser. Extract hobbies and interests from the resume text below. Return ONLY valid JSON, no markdown fences.

## Output Schema
{{
  "hobbies": ["hobby1", "hobby2"]
}}

## Resume Text
{text}"""


# ─────────────────────────────────────────────────────────────────────────
# 11. DECLARATION (not in onboarding form, extracted for completeness)
# ─────────────────────────────────────────────────────────────────────────
DECLARATION_PROMPT = """\
You are a resume parser. Extract the declaration/affirmation statement from the resume text below. Return ONLY valid JSON, no markdown fences.

## Output Schema
{{
  "declaration": "full declaration text or null"
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
