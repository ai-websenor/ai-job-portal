EXTRACTION_PROMPT = """You are a resume parser. Extract structured data from the resume text below and return ONLY valid JSON.

## Output Format
Return a JSON object with these exact fields. For each field, provide a "value" (string or null) and "confidence" (float 0.0-1.0).
- confidence 0.9-1.0: clearly stated in resume
- confidence 0.7-0.89: inferred from context
- confidence 0.5-0.69: ambiguous or partially visible
- confidence 0.0: field not found (value should be null)

```json
{{
  "personal": {{
    "name": {{"value": "full name", "confidence": 0.0}},
    "first_name": {{"value": "first/given name", "confidence": 0.0}},
    "last_name": {{"value": "last/family name", "confidence": 0.0}},
    "email": {{"value": "email or null", "confidence": 0.0}},
    "phone": {{"value": "phone with country code if visible", "confidence": 0.0}},
    "address": {{"value": "full address or null", "confidence": 0.0}},
    "city": {{"value": "city from address or null", "confidence": 0.0}},
    "state": {{"value": "state/province from address or null", "confidence": 0.0}},
    "country": {{"value": "country from address or null", "confidence": 0.0}},
    "linkedin": {{"value": "LinkedIn URL or null", "confidence": 0.0}},
    "github": {{"value": "GitHub URL or null", "confidence": 0.0}},
    "website": {{"value": "portfolio/personal website URL or null", "confidence": 0.0}},
    "summary": {{"value": "profile summary/objective text or null", "confidence": 0.0}},
    "headline": {{"value": "one-line professional headline or null", "confidence": 0.0}},
    "date_of_birth": {{"value": "DOB in DD/MM/YYYY or as stated, or null", "confidence": 0.0}},
    "gender": {{"value": "Male/Female/Other or null", "confidence": 0.0}},
    "nationality": {{"value": "nationality or null", "confidence": 0.0}},
    "marital_status": {{"value": "Married/Unmarried/Single or null", "confidence": 0.0}}
  }},
  "experience": [
    {{
      "company": {{"value": "company name", "confidence": 0.0}},
      "role": {{"value": "job title/designation", "confidence": 0.0}},
      "location": {{"value": "city/location where they worked", "confidence": 0.0}},
      "start_date": {{"value": "YYYY-MM or null", "confidence": 0.0}},
      "end_date": {{"value": "YYYY-MM or Present or null", "confidence": 0.0}},
      "description": {{"value": "all responsibilities and achievements joined by semicolons", "confidence": 0.0}}
    }}
  ],
  "education": [
    {{
      "institution": {{"value": "school/college/university name", "confidence": 0.0}},
      "degree": {{"value": "degree name (B.Tech, MCA, MBA, etc.)", "confidence": 0.0}},
      "field": {{"value": "field of study or null", "confidence": 0.0}},
      "year": {{"value": "graduation year YYYY or null", "confidence": 0.0}},
      "grade": {{"value": "CGPA/percentage/marks as stated or null", "confidence": 0.0}},
      "description": {{"value": "additional details, activities, thesis or null", "confidence": 0.0}}
    }}
  ],
  "skills": [
    {{"value": "individual skill name", "confidence": 0.0}}
  ],
  "certifications": [
    {{
      "name": {{"value": "certification name", "confidence": 0.0}},
      "issuer": {{"value": "issuing organization", "confidence": 0.0}},
      "year": {{"value": "YYYY or null", "confidence": 0.0}}
    }}
  ],
  "projects": [
    {{
      "name": {{"value": "project name", "confidence": 0.0}},
      "description": {{"value": "what the project does, all points joined by semicolons", "confidence": 0.0}},
      "technologies": {{"value": "comma-separated tech stack used", "confidence": 0.0}},
      "url": {{"value": "project URL or null", "confidence": 0.0}}
    }}
  ],
  "achievements": [
    {{
      "title": {{"value": "achievement description", "confidence": 0.0}},
      "year": {{"value": "YYYY or null", "confidence": 0.0}}
    }}
  ],
  "publications": [
    {{
      "title": {{"value": "publication/paper/article title", "confidence": 0.0}},
      "publisher": {{"value": "journal/conference/blog name", "confidence": 0.0}},
      "year": {{"value": "YYYY or null", "confidence": 0.0}},
      "url": {{"value": "URL or null", "confidence": 0.0}}
    }}
  ],
  "languages": [
    {{
      "name": {{"value": "language name (English, Hindi, etc.)", "confidence": 0.0}},
      "proficiency": {{"value": "Native/Fluent/Conversational/Basic or as stated", "confidence": 0.0}}
    }}
  ],
  "hobbies": [
    {{"value": "hobby or interest", "confidence": 0.0}}
  ]
}}
```

## Rules
- Return ONLY the JSON object, no markdown fences, no explanation
- Dates: use YYYY-MM format (e.g., 2020-01). If only year visible, use YYYY-01
- If currently employed, end_date value = "Present"
- Missing fields: value = null, confidence = 0.0
- Skills: extract individual skills, not categories. "Languages: Python, Java" → two separate skill entries
- Phone: include country code if visible
- List experience and education in reverse chronological order (most recent first)

## Bullet-Point Handling (CRITICAL)
- If a description field contains bullet points, numbered lists, or multiple lines of responsibilities:
  Join ALL points into a SINGLE string separated by "; "
  Bullet points are clearly stated data = confidence 0.9-1.0
  Example input: "- Built REST APIs\n- Led team of 5\n- Reduced latency by 40%"
  Example output: {{"value": "Built REST APIs; Led team of 5; Reduced latency by 40%", "confidence": 0.95}}
- Do NOT return null or 0.0 confidence for bullet-point descriptions. They contain real content.

## Name Splitting
- Split full name into first_name and last_name
- If only one name, put it in first_name, last_name = null
- "Prashant Kumar Gupta" → first_name: "Prashant", last_name: "Kumar Gupta"

## Address Breakdown
- Extract full address in the address field
- Also extract city, state, country SEPARATELY from the address
- If "Bangalore, Karnataka" → city: "Bangalore", state: "Karnataka", country: "India" (infer if obvious)
- If only city is visible, set state/country to null with confidence 0.0

## Summary & Headline
- summary: extract from sections named "Objective", "Career Objective", "About Me", "Profile Summary", "Professional Summary", "Carrier Objective" (common misspelling)
- headline: if a one-line professional title exists (e.g., "Full Stack Developer with 5 years experience"), extract it. If not explicitly present, set to null

## Section Recognition (handle non-standard names)
- Projects: "Projects", "Projects Done", "Key Projects", "Academic Projects", "Side Projects"
- Achievements: "Awards", "Achievements", "Accomplishments", "Honours", "Personal Strengths" (when it contains actual awards/rankings)
- Hobbies: "Hobbies", "Interests", "Personal Interests", "Extracurricular", "Extra-Curricular"
- Languages: "Languages", "Languages Known", "Language Proficiency"
- Publications: "Publications", "Papers", "Research", "Talks & Writing", "Blog Posts"
- Personal details: DOB, gender, nationality, marital status are common in Indian resumes/CVs/Biodata

## Resume Text
{resume_text}"""


def build_prompt(resume_text: str) -> str:
    return EXTRACTION_PROMPT.format(resume_text=resume_text)
