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
    "email": "email address exactly as written, or empty string",
    "headline": "standalone professional title line or empty string",
    "professionalSummary": "COMPLETE profile summary/objective or empty string",
    "country": "country or empty string",
    "state": "state/province or empty string",
    "city": "city or empty string",
    "linkedin": "LinkedIn URL or empty string",
    "github": "GitHub URL or empty string",
    "website": "portfolio/personal website URL or empty string",
    "gender": "Male or Female or Other or empty string",
    "dateOfBirth": "YYYY-MM-DD if stated, else empty string",
    "nationality": "nationality if stated, else empty string",
    "maritalStatus": "marital status if stated, else empty string",
    "address": "full street address if stated, else empty string",
    "hobbies": "hobbies/interests joined by '; ', else empty string",
    "declaration": "declaration/affirmation statement if present, else empty string"
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
- Email: extract exactly as written (e.g. "gobhi28396@gmail.com"). Look near "Email:", "E-mail:", or bare in the contact block. If not found, set to "". NEVER put an email address in the "website" field.
- LinkedIn: look for URLs containing "linkedin.com/in/" anywhere in the resume, including inside an "[EMBEDDED LINKS]" block if present. ALWAYS prefix with "https://" if missing. "linkedin.com/in/username" → "https://linkedin.com/in/username". If not found, set to "".
- GitHub: look for URLs containing "github.com/" anywhere in resume, including inside an "[EMBEDDED LINKS]" block if present. ALWAYS prefix with "https://" if missing. If not found, set to "".
- Website: look for portfolio/personal website URLs. NEVER put a LinkedIn or GitHub URL here — those belong only in their own fields. If not found, set to "".
- Gender: extract if explicitly stated (Male/Female/Other). Common in Indian resumes. If not found, set to "".
- Summary: extract COMPLETE text from "Objective", "Career Objective", "About Me", "Profile Summary", "Professional Summary", "Summary", "Profile", "Executive Summary", "Carrier Objective" (misspelling), or the first paragraph after name/contact. This includes summaries formatted as bullet points — extract them too. Do NOT truncate. If bullet points, join ALL with "; ".
- Headline: ONLY if an explicit standalone professional title line exists (e.g., "Senior Java Developer | 8 Years Experience"). Do NOT fabricate from summary. If none, set to empty string "".
- Location: extract city, state, country SEPARATELY from address. If "Bangalore, Karnataka" → city: "Bangalore", state: "Karnataka", country: "India" (infer if obvious). If only city visible, set state/country to "".
- dateOfBirth, nationality, maritalStatus, address, hobbies, declaration: extract only if explicitly present under labels like "Date of Birth", "DOB", "Nationality", "Marital Status", "Address", "Hobbies"/"Interests", "Declaration". If absent, use empty string "".
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
      "description": ["responsibility bullet 1", "responsibility bullet 2"],
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
- employmentType: infer ONLY from explicit context. "Intern" → "internship", "Freelance"/"Consultant" → "freelance", "Contract" → "contract", "Part-time" → "part_time". If nothing indicates the type, leave "" — do NOT default to "full_time".
- description: extract responsibilities/duties as a JSON ARRAY — one element per bullet point. Do NOT summarize or omit. Even 10+ points = include ALL as separate array elements. If no description found, use [].
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
- The year can appear BEFORE the degree on the same row (e.g. "2007 B. E", "2003 HSC"). That single year is still the passing/graduation year → endDate=that year, startDate=null. Do NOT invent a start year, and NEVER borrow a year from a different row.
- List in reverse chronological order (most recent first).
- Include all degrees: B.Tech, MCA, MBA, 12th, 10th, Diploma, etc.
- grade: extract for EVERY entry that states one, not only the first/most-recent. Do not copy one entry's grade onto another.
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
      "proficiencyLevel": "beginner or intermediate or advanced or expert, or empty string if not stated",
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
- proficiencyLevel MUST be one of: "beginner", "intermediate", "advanced", "expert", or "" (empty string). If the resume does not state or clearly imply a level for that specific skill, leave it "". Do NOT default to "intermediate" and do NOT guess from overall years of experience on the resume.

## Rules
- Extract INDIVIDUAL skills, not categories. "Languages: Python, Java" = two entries.
- Split compound lists. "HTML/CSS/JavaScript" = 3 entries.
- Include technical skills, tools, frameworks, methodologies.
- A skill is a NAMED technology, tool, language, framework, or platform. Do NOT extract responsibility/duty/activity phrases as skills. Wrong: "Desktop calls", "Helping team", "Network checking", "Implementing new network setup", "Printer Installation", "Application", "Software". Right: "Windows 10", "AutoCAD", "MS Visio", "LAN", "VPN".
- proficiencyLevel: only set when the resume states it explicitly for THIS skill (e.g. "Expert in Python", "Python (Advanced)"). Do NOT infer from total years of professional experience — a candidate with 10 years overall is not automatically "expert" in every listed skill. If unstated, leave "".
- yearsOfExperience: extract ONLY if explicitly stated for THIS skill (e.g., "5+ years of Java"). Do NOT copy the candidate's total years of experience onto unrelated skills. Otherwise null.
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
      "url": "project URL or empty string",
      "role": "candidate's role on the project, or empty string",
      "duration": "duration/date range as stated (e.g. 'Oct 2020 - Present'), or empty string",
      "teamSize": "team size as stated, or empty string",
      "responsibilities": "responsibilities bullets joined by '; ', or empty string"
    }}
  ]
}}

## Rules
- Extract from "Projects", "Key Projects", "Academic Projects", "Side Projects" sections.
- Do NOT include work experience entries here.
- Bullet points in description or responsibilities: join ALL with "; ".
- role, duration, teamSize: extract only if explicitly stated (e.g. "Role:", "Team Size:", "Duration:" labels). Do NOT invent.
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


# ─────────────────────────────────────────────────────────────────────────
# RAW-MODE UNIFIED PROMPT — one page in, full ResumeOutput schema out
# ─────────────────────────────────────────────────────────────────────────
# Used by the `parse_mode=raw` pipeline. The LLM gets ONE page of the resume
# and is asked for every field in the schema; missing fields return empty
# string / empty array. Outputs from all pages are merged + deduped by
# chunked_processor.merge_page_results.
RAW_UNIFIED_PROMPT = """\
You are a resume parser. You will be given a SMALL CHUNK of text from a resume. Extract ONLY the fields that are visibly present in this chunk. Return ONLY valid JSON, no markdown fences.

## Grounding — read this first
Copy values verbatim from the text. If a value is not literally written in THIS chunk, omit the key —
another chunk will supply it. Never infer, estimate, or invent dates, companies, certifications,
proficiency levels, or years of experience.

Wrong → Right examples:
- Chunk shows "Freelance Developer, Acme Corp" with no dates → Wrong: startDate="2019-01-01" (guessed). Right: startDate=null, endDate=null.
- Chunk lists skills including AWS but no certifications section → Wrong: certifications=[{{"name": "AWS Certified Developer"}}] (invented). Right: omit "certifications" entirely.
- Contact block has "Email: jane@x.com" and nothing else URL-shaped → Wrong: website="jane@x.com". Right: email="jane@x.com", omit "website".

{chunk_header}

## Available top-level keys (use only the ones that have data in this chunk)
- "personalDetails": object with {{firstName, lastName, phone, email, headline, professionalSummary, country, state, city, linkedin, github, website, gender, dateOfBirth, nationality, maritalStatus, address, hobbies, declaration}}
- "educationalDetails": array of {{degree, institution, fieldOfStudy, startDate, endDate, grade, currentlyStudying}}
- "skills": array of {{skillName, proficiencyLevel, yearsOfExperience}}
- "experienceDetails": array of {{title, designation, companyName, employmentType, location, startDate, endDate, isCurrent, description, achievements, skillsUsed}}
- "certifications": array of {{name, issuingOrganization, issueDate, expiryDate, credentialId, credentialUrl}}
- "projects": array of {{name, description, technologies, url, role, duration, teamSize, responsibilities}}
- "languages": array of {{name, proficiency}}

## CRITICAL — Partial Output
- Return ONLY the top-level keys that have data in this chunk. OMIT keys entirely when absent.
- Empty body `{{}}` is acceptable if the chunk has nothing to extract.
- Do NOT echo empty sub-fields for keys you're including — if you include "personalDetails", fill ONLY the sub-fields you find, omit the rest.
- NEVER return "N/A", "Not Specified", "Not Available", "Not Mentioned", "None", "Unknown", "Nil", "-", or "--" for ANY field. If you don't have the data, omit the key.
- Do NOT guess or fabricate. Other chunks will fill in missing fields.

## Hard Rules
- Dates: strict YYYY-MM-DD. "Jan 2020" → "2020-01-01". Year only → "2020-01-01". A single graduation/passing year (e.g. "passed out in 2016", "2016") → endDate="2016-01-01", startDate=null. NEVER return literal "YYYY-01-01".
- experienceDetails "description" is a JSON ARRAY of strings — one element per bullet/responsibility (e.g. ["Built X", "Owned Y"]). Keep ALL bullets; do NOT summarize, truncate, or drop. Use [] if none. (achievements stays a single string, join with "; ".)
- LinkedIn / GitHub: look in the visible text AND inside any "[EMBEDDED LINKS]" block (hyperlink targets that may not appear as visible text). If you see a URL fragment like "linkedin.com/in/xyz", prefix with "https://". Incomplete URLs like bare "https://linkedin.com" → omit the field. Never put a LinkedIn or GitHub URL in "website".
- email: extract exactly as written. Never put an email address in "website".
- employmentType: one of "full_time" | "part_time" | "contract" | "internship" | "freelance", or omit if not explicitly stated. Do NOT default to "full_time".
- proficiencyLevel: one of "beginner" | "intermediate" | "advanced" | "expert", or omit if not explicitly stated for that specific skill. Do NOT infer from the candidate's total years of experience and do NOT default to "intermediate".
- Name splitting: "Prashant Kumar Gupta" → firstName "Prashant", lastName "Kumar Gupta".
- Location: geographic place only, NEVER a date or "Present".

## Classification Rules
- experienceDetails[] is ONLY for actual employment — each entry MUST have a company name AND a date range (month/year). Example: "Bhavitha Tech Solutions Pvt. Ltd., Bangalore | May 2024 – Present".
- projects[] is for every standalone project block. Signals a project (not experience):
  * Appears after a header like "PROJECTS", "PROJECT SUMMARY", "KEY PROJECTS", "ACADEMIC PROJECTS".
  * Numbered list entries like "1) HRMS – Government System", "2) AssetWRK – Asset Management", "3)", "4)", "5)" — numbered lists are ALWAYS projects, NEVER experience.
  * No company name and no date range — goes in projects[].
  * Titled with a product/tool name followed by "–" or ":" and a description.
  * CRITICAL: rich bullets/description does NOT make something experience. If there's no company + no dates, it IS a project.
- Sections labelled RESPONSIBILITIES, KEY DUTIES, ROLES AND RESPONSIBILITIES, WORK DETAILS → bullets fold into `experienceDetails[].description` (the bullet array) of the most recent real job; if no job in this chunk, emit an experienceDetails entry with title="" and description=array of bullets so it can be merged later.
- Spoken/human languages (English, Hindi, etc.) → languages[]. Programming languages → skills[].
- Technical Skills / Tech Stack / Technologies content (even if the header appears inline with preceding text) → split into individual skills[] entries.
- "Languages: JavaScript, HTML, CSS" → three separate skill entries.
- A skill is a NAMED technology/tool/language/framework/platform — NOT a responsibility or duty phrase. Never emit "Desktop calls", "Helping team", "Network checking", "Implementing new network setup", or bare "Application"/"Software" as skills.

## personalDetails extraction (when the chunk contains the resume top)
- **headline**: ONLY the standalone title line directly under the candidate's name (e.g., "REACT JS DEVELOPER", "Senior Java Developer | 8 Years Experience"). Extract exactly as written. Do NOT fabricate from professionalSummary — NEVER take the first sentence of the summary as the headline. If absent, omit the key.
- **professionalSummary**: the FULL text of any "Summary", "Professional Summary", "Profile", "Objective", "Career Objective", "About Me", "Profile Summary", or "Executive Summary" section — including when it's formatted as bullet points rather than a paragraph (that still counts as the summary). Join bullets with "; ". Do NOT truncate. If a chunk contains only the summary text (no header keyword), still include it if it reads as an intro paragraph right after the contact block.

## Education grades
- Extract "grade" for EVERY educationalDetails[] entry in this chunk that states one, not only the first/most-recent entry. Grades are per-entry — never copy one entry's grade onto another.

## Date normalization
- "Jan 2020" → "2020-01-01"
- "2020" (year only, e.g. graduation year) → "2020-01-01"
- "2021 – 2024" (year range) → startDate "2021-01-01", endDate "2024-01-01"
- NEVER emit bare "2021" or literal "YYYY-01-01".

## Chunk Content
{text}"""


def build_raw_page_prompt(text: str, chunk_num: int, total_chunks: int) -> str:
    """Build the raw-mode partial-JSON chunk prompt."""
    chunk_header = f"## Context\nChunk {chunk_num} of {total_chunks}."
    return RAW_UNIFIED_PROMPT.format(chunk_header=chunk_header, text=text)


# ─────────────────────────────────────────────────────────────────────────
# WHOLE-RESUME PROMPT — single LLM call over the full PDF text
# ─────────────────────────────────────────────────────────────────────────
# Used by the `/parse-whole` debug endpoint for quality comparison against
# the chunked pipeline. Asks for the full ResumeOutput schema in one shot
# with no per-chunk partial-JSON relaxation.
RAW_WHOLE_PROMPT = """\
You are a resume parser. You will be given the FULL text of a resume. Extract every field into the schema below. Return ONLY valid JSON, no markdown fences.

## Grounding — read this first
Copy values verbatim from the text. If a value is not literally written, output "" / null / omit it.
Never infer, estimate, or invent dates, companies, certifications, proficiency levels, or years of
experience. A wrong guess is worse than leaving a field empty — empty fields are expected and normal.

Wrong → Right examples:
- Text has no dates for "Freelance Developer, Acme Corp" → Wrong: startDate="2019-01-01" (guessed). Right: startDate=null, endDate=null.
- Text lists no certifications → Wrong: certifications=[{{"name": "AWS Certified Developer", ...}}] (invented because skills mention AWS). Right: certifications=[].
- Contact block has "Email: jane@x.com" only, no separate website line → Wrong: website="jane@x.com" or website="https://jane@x.com". Right: email="jane@x.com", website="".

## Output Schema (all top-level keys required; use [] or "" if truly absent)
{{
  "personalDetails": {{
    "firstName": "", "lastName": "", "phone": "", "email": "",
    "headline": "", "professionalSummary": "",
    "country": "", "state": "", "city": "",
    "linkedin": "", "github": "", "website": "",
    "gender": "", "dateOfBirth": "", "nationality": "",
    "maritalStatus": "", "address": "", "hobbies": "", "declaration": ""
  }},
  "educationalDetails": [
    {{"degree": "", "institution": "", "fieldOfStudy": "", "startDate": null, "endDate": null, "grade": "", "currentlyStudying": false}}
  ],
  "skills": [
    {{"skillName": "", "proficiencyLevel": "", "yearsOfExperience": null}}
  ],
  "experienceDetails": [
    {{"title": "", "designation": "", "companyName": "", "employmentType": "", "location": "", "startDate": null, "endDate": null, "isCurrent": false, "description": [], "achievements": "", "skillsUsed": ""}}
  ],
  "certifications": [
    {{"name": "", "issuingOrganization": "", "issueDate": null, "expiryDate": null, "credentialId": "", "credentialUrl": ""}}
  ],
  "projects": [
    {{"name": "", "description": "", "technologies": "", "url": "", "role": "", "duration": "", "teamSize": "", "responsibilities": ""}}
  ],
  "languages": [
    {{"name": "", "proficiency": ""}}
  ]
}}

## CRITICAL Rules
- NEVER return "N/A", "Not Specified", "Not Available", "Not Mentioned", "None", "Unknown", "Nil", "-", "--" — use "" instead.
- Dates STRICT YYYY-MM-DD. "Jan 2020" → "2020-01-01". Year only → use the actual year, e.g. "2020" → "2020-01-01". A single graduation/passing year (e.g. "passed out in 2016", bare "2016") → endDate="2016-01-01", startDate=null. NEVER emit the literal placeholder string "YYYY-01-01" — always substitute the real year.
- experienceDetails "description" is a JSON ARRAY of strings — ONE element per responsibility/bullet. Keep ALL bullets, never summarize or drop. Example: ["Led team of 5", "Reduced API latency 40%"]. If none, use [].
- achievements: still a single string, join multiple with "; ".
- LinkedIn/GitHub: check visible text AND any "[EMBEDDED LINKS]" block. If you see a fragment like "linkedin.com/in/xyz", prefix with "https://". Incomplete URLs like bare "https://linkedin.com" → "". Never put a LinkedIn/GitHub URL in "website"; never put an email in "website".
- employmentType ∈ {{full_time, part_time, contract, internship, freelance}} or "" if not stated. Do NOT default to "full_time".
- proficiencyLevel ∈ {{beginner, intermediate, advanced, expert}} or "" if not explicitly stated for that skill. Do NOT infer from total years of experience; do NOT default to "intermediate".
- Name splitting: "Prashant Kumar Gupta" → firstName "Prashant", lastName "Kumar Gupta".

## Classification Rules
- experienceDetails[] is ONLY for jobs that have BOTH a company name AND a date range.
- projects[] is for every block that lacks a company + dates, especially:
  * Items under PROJECTS / PROJECT SUMMARY / KEY PROJECTS headers
  * Numbered "1) Foo", "2) Bar" lists — ALWAYS projects, NEVER experience
  * Titled entries with "–" or ":" describing a product/tool
- RESPONSIBILITIES / KEY DUTIES / ROLES AND RESPONSIBILITIES / WORK DETAILS — bullets fold into the most recent experienceDetails entry's `description`.
- Spoken languages (English, Hindi) → languages[]. Programming languages → skills[].
- Split compound skill lines ("Languages: JavaScript, HTML, CSS" → three skill entries).
- A skill is a NAMED technology/tool/language/framework/platform. Do NOT record responsibility or duty phrases as skills (e.g. "Desktop calls", "Helping team", "Network checking", "Implementing new network setup", bare "Application"/"Software").

## Headline
- ONLY a standalone professional-title line directly under the candidate's name (e.g. "Senior Java Developer | 8 Years Experience"). Extract exactly as written.
- Do NOT fabricate a headline from the summary. NEVER take the first sentence of professionalSummary and copy it into headline. If no standalone title line exists, headline="".

## professionalSummary
- Full text of any "Summary" / "Professional Summary" / "Profile" / "Objective" / "Career Objective" / "About Me" / "Executive Summary" section. Do NOT truncate.
- If that section is formatted as bullet points rather than a paragraph, it still counts — join ALL bullets with "; ". Example: bullets "Results-driven engineer" / "5+ years in backend systems" / "Strong in Python and Go" → professionalSummary = "Results-driven engineer; 5+ years in backend systems; Strong in Python and Go".

## Education grades
- Extract "grade" for EVERY educationalDetails[] entry that states one, not only the first/most-recent entry. Each entry's grade is independent — do not copy one entry's grade onto another.

## Education dates
- A single year on a degree row is the passing/graduation year → endDate=that year, startDate=null. This holds even when the year appears BEFORE the degree name (e.g. "2007 B. E", "2003 HSC", "2001 SSC" — B.E endDate=2007, HSC endDate=2003, SSC endDate=2001).
- Do NOT fabricate a start year and NEVER borrow another row's year to build a range. Only emit a start/end range when that row itself shows two years.

## Extended personal fields
- dateOfBirth, nationality, maritalStatus, address, hobbies, declaration: fill ONLY when explicitly present under a matching label (e.g. "Date of Birth", "DOB", "Nationality", "Marital Status", "Address", "Hobbies"/"Interests", "Declaration"). Do not infer any of these. If absent, "".

## Project fields
- role, duration, teamSize, responsibilities: fill ONLY when explicitly stated (e.g. "Role:", "Duration:", "Team Size:" labels, or a responsibilities bullet list under the project). Do NOT invent a role or duration from context. Join responsibilities bullets with "; ".

## Resume Text
{text}"""


def build_raw_whole_prompt(text: str) -> str:
    """Build the whole-resume prompt for the /parse-whole debug endpoint."""
    return RAW_WHOLE_PROMPT.format(text=text)
