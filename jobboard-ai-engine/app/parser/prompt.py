EXTRACTION_PROMPT = """You are a resume parser. Extract structured data from the resume text below and return ONLY valid JSON.

## Output Format
Return a JSON object matching the onboarding form schema. No confidence scores. Use empty string "" for missing text fields, null for missing dates, false for missing booleans.

```json
{{
  "personalDetails": {{
    "firstName": "first/given name or empty string",
    "lastName": "last/family name or empty string",
    "phone": "phone with country code if visible, or empty string",
    "headline": "standalone professional title line or empty string",
    "professionalSummary": "COMPLETE profile summary/objective text or empty string",
    "country": "country or empty string",
    "state": "state/province or empty string",
    "city": "city or empty string",
    "linkedin": "LinkedIn URL or empty string",
    "github": "GitHub URL or empty string",
    "website": "portfolio/personal website URL or empty string",
    "gender": "Male or Female or Other or empty string"
  }},
  "experienceDetails": [
    {{
      "title": "job title/role",
      "designation": "same as title",
      "companyName": "company name",
      "employmentType": "full_time or part_time or contract or internship or freelance",
      "location": "geographic place (city/state/country) — NOT a date",
      "startDate": "YYYY-MM-DD or null",
      "endDate": "YYYY-MM-DD or null",
      "isCurrent": false,
      "description": ["responsibility bullet 1", "responsibility bullet 2"],
      "achievements": "quantified results joined by '; ' or empty string",
      "skillsUsed": "comma-separated tech/tools or empty string"
    }}
  ],
  "educationalDetails": [
    {{
      "degree": "degree name (B.Tech, MCA, MBA, etc.)",
      "institution": "school/college/university name",
      "fieldOfStudy": "field of study or empty string",
      "startDate": "YYYY-MM-DD or null",
      "endDate": "YYYY-MM-DD or null",
      "grade": "NUMBER only, e.g. \\"8.5\\" or \\"75\\", or empty string",
      "gradeType": "cgpa or percentage or empty string",
      "currentlyStudying": false
    }}
  ],
  "skills": [
    {{
      "skillName": "individual skill name",
      "proficiencyLevel": "beginner or intermediate or advanced or expert",
      "yearsOfExperience": null
    }}
  ],
  "certifications": [
    {{
      "name": "certification name",
      "issuingOrganization": "issuing organization or empty string",
      "issueDate": "YYYY-MM-DD or null",
      "expiryDate": null,
      "credentialId": "",
      "credentialUrl": ""
    }}
  ],
  "projects": [
    {{
      "name": "project name",
      "description": "what the project does",
      "technologies": "comma-separated tech stack",
      "url": "project URL or empty string"
    }}
  ],
  "languages": [
    {{
      "name": "language name (English, Hindi, etc.)",
      "proficiency": "Native/Fluent/Conversational/Basic or as stated"
    }}
  ]
}}
```

## CRITICAL — Empty Field Rules
- NEVER return "N/A", "Not Specified", "Not Available", "Not Mentioned", "None", "Unknown", "Nil", "-", or "--" for ANY field.
- If information is not found, use empty string "" for text fields. Use null ONLY for date fields.
- Do NOT duplicate experience entries. Each job/role should appear exactly ONCE.

## Rules
- Return ONLY the JSON object, no markdown fences, no explanation
- Dates: use YYYY-MM-DD format. "Jan 2020" = "2020-01-01". Year only → use actual year e.g. "2020" = "2020-01-01". NEVER return literal "YYYY-01-01". Day unknown = use 01.
- If currently employed: isCurrent=true, endDate=null. "Till Date"/"Till Now"/"Current"/"Ongoing"/"Present" all mean isCurrent=true.
- Present-tense phrasing marks the live role even with no dates: "Working as a Senior Software Engineer in X", "Currently working with X" → isCurrent=true, endDate=null. Past tense ("Worked as ... in X") → isCurrent=false.
- If end_date clearly visible: extract as YYYY-MM-DD, isCurrent=false.
- Location: MUST be geographic place. NEVER put dates or "Present" in location. If not found, use "".
- Missing fields: empty string "" for text, null for dates, false for booleans.
- Skills: extract individual skills, not categories. "Languages: Python, Java" = two separate skill entries.
- Skills: also extract from "Environment", "Technologies Used", "Tech Stack" within experience into both skillsUsed and top-level skills.
- Skills: a "TOOLS", "SOFTWARE", "PLATFORMS", "IDE", "FRAMEWORKS" or "DATABASES" section is ALSO skills[] — extract every item, not only those under "Technical Skills".
- technologies / skillsUsed: NAMED technologies only, comma-separated. NEVER copy a responsibilities bullet into them — those belong in description/responsibilities.
- languages: only spoken languages the resume actually names. NEVER add "English" just because the resume is written in English.
- issuingOrganization: the body that ISSUED the certification, never a repeat of the certification's own name. Not stated → "".
- List experience and education in reverse chronological order.

## Bullet-Point Handling (CRITICAL)
- Join ALL bullet points into a SINGLE string separated by "; ". Do NOT summarize or omit.
- For experience descriptions: extract ALL bullet points. Even 10+ points = include ALL.

## Summary & Headline
- professionalSummary: from "Objective", "Career Objective", "About Me", "Profile Summary", "Professional Summary", "Summary" sections. Extract COMPLETE text. If bullet points, join ALL with "; ".
- professionalSummary: if the resume has MORE THAN ONE such section (e.g. both "CAREER OBJECTIVE" and "PROFILE SUMMARY"), concatenate ALL of them with "; ". Never keep only the first.
- headline: ONE role title, copied verbatim from a single standalone line in the header (usually printed under the candidate's name, e.g. "Salesforce Developer"). Copy that ONE line exactly.
- headline: NEVER join or list multiple job titles ("X | Y | Z"). NEVER build it from the work-experience section. Do NOT fabricate from summary. If no standalone title line exists, empty string "".

## Experience vs Projects
- Company + dates + job title = experienceDetails entry
- Project name + description + technologies = projects entry
- title and designation: set both to the same job title value.
- employmentType: infer from context. Default "full_time".
- description: responsibilities as a JSON array (one element per bullet). achievements: quantified results as a string (separate from description).
- skillsUsed: comma-separated string from "Tech Stack:", "Environment:", etc.

## Education
- If currently studying: currentlyStudying=true, endDate=null.
- If only graduation year visible, set as endDate.
- grade: a NUMBER only — "8.5" (CGPA) or "75" (percentage). Set gradeType to "cgpa" or "percentage" to match.
- grade: NEVER put a year, a passing note ("Passed out in 2007"), a class ("First Class"), or a letter grade in it. If the resume states no numeric grade, use "" for both grade and gradeType.

## Skills
- proficiencyLevel MUST be one of: "beginner", "intermediate", "advanced", "expert". Default = "intermediate". NEVER leave empty.
- yearsOfExperience: extract if stated, otherwise null.

## URLs
- LinkedIn: ALWAYS prefix with "https://" if missing. "linkedin.com/in/user" → "https://linkedin.com/in/user". If not found, use "".
- GitHub: ALWAYS prefix with "https://" if missing. If not found, use "".

## Location Breakdown
- Extract city, state, country SEPARATELY.
- "Bangalore, Karnataka" = city "Bangalore", state "Karnataka", country "India" (infer if obvious).

## Resume Text
{resume_text}"""


def build_prompt(resume_text: str) -> str:
    return EXTRACTION_PROMPT.format(resume_text=resume_text)
