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
    "summary": {{"value": "COMPLETE profile summary/objective text or null", "confidence": 0.0}},
    "headline": {{"value": "one-line professional title ONLY if explicitly present, or null", "confidence": 0.0}},
    "date_of_birth": {{"value": "DOB in DD/MM/YYYY or as stated, or null", "confidence": 0.0}},
    "gender": {{"value": "Male/Female/Other or null", "confidence": 0.0}},
    "nationality": {{"value": "nationality or null", "confidence": 0.0}},
    "marital_status": {{"value": "Married/Unmarried/Single or null", "confidence": 0.0}},
    "declaration": {{"value": "declaration/affirmation statement if present, or null", "confidence": 0.0}}
  }},
  "experience": [
    {{
      "company": {{"value": "company name", "confidence": 0.0}},
      "role": {{"value": "job title/designation", "confidence": 0.0}},
      "location": {{"value": "city or geographic place where they worked (NOT a date, NOT 'Present')", "confidence": 0.0}},
      "start_date": {{"value": "YYYY-MM or null", "confidence": 0.0}},
      "end_date": {{"value": "YYYY-MM or Present or null", "confidence": 0.0}},
      "description": {{"value": "ALL responsibilities and achievements joined by semicolons — do NOT omit any", "confidence": 0.0}},
      "skills_used": ["skill1", "skill2", "skill3"]
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
      "client": {{"value": "client or company name for the project, or null", "confidence": 0.0}},
      "role": {{"value": "candidate's role in the project, or null", "confidence": 0.0}},
      "description": {{"value": "what the project does — brief overview", "confidence": 0.0}},
      "responsibilities": {{"value": "candidate's responsibilities in the project, joined by semicolons, or null", "confidence": 0.0}},
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
- Dates: parse carefully. "Jan 2020" = "2020-01", "March 2023" = "2023-03", "2019 - 2021" = start "2019-01", end "2021-01"
- If currently employed, end_date value = "Present". Also: "Till Date", "Till Now", "Current", "Ongoing" all → end_date = "Present"
- If end_date is clearly visible in the resume, extract it exactly. Do NOT leave it null if it exists.
- Location field: MUST be a geographic place (city/state/country). NEVER put dates or "Present" in location. Double-check every experience entry.
- Missing fields: value = null, confidence = 0.0
- Skills: extract individual skills, not categories. "Languages: Python, Java" → two separate skill entries
- Skills: also extract skills from "Environment", "Technologies Used", "Tech Stack" sections within experience entries into both skills_used array and the top-level skills array
- Phone: include country code if visible
- List experience and education in reverse chronological order (most recent first)
- LinkedIn: look for URLs containing "linkedin.com/in/" anywhere in the resume — header, footer, contact section. If URL appears without https prefix (e.g., "linkedin.com/in/username"), reconstruct as "https://linkedin.com/in/username"

## Bullet-Point Handling (CRITICAL)
- If a description field contains bullet points, numbered lists, or multiple lines of responsibilities:
  Join ALL points into a SINGLE string separated by "; "
  Bullet points are clearly stated data = confidence 0.9-1.0
  Example input: "- Built REST APIs\n- Led team of 5\n- Reduced latency by 40%"
  Example output: {{"value": "Built REST APIs; Led team of 5; Reduced latency by 40%", "confidence": 0.95}}
- Do NOT return null or 0.0 confidence for bullet-point descriptions. They contain real content.
- For experience descriptions: extract ALL bullet points, ALL responsibilities, ALL achievements listed under that role. Do NOT summarize. Do NOT omit points. Include EVERY listed point joined by "; ". Even if 10+ bullet points, include ALL of them.

## Name Splitting
- Split full name into first_name and last_name
- If only one name, put it in first_name, last_name = null
- "Prashant Kumar Gupta" → first_name: "Prashant", last_name: "Kumar Gupta"

## Address Breakdown
- Extract full address in the address field
- Also extract city, state, country SEPARATELY from the address
- If "Bangalore, Karnataka" → city: "Bangalore", state: "Karnataka", country: "India" (infer if obvious)
- If only city is visible, set state/country to null with confidence 0.0

## Summary & Headline (CRITICAL — read carefully)
- summary: Look for sections named "Objective", "Career Objective", "About Me", "Profile Summary", "Professional Summary", "Summary", "Profile", "Executive Summary", "Carrier Objective" (common misspelling).
  Also check the FIRST paragraph/bullet-list after the name/contact section — some resumes place the summary without a section header.
  Extract the COMPLETE text — do NOT truncate. If it contains bullet points, join ALL of them with "; ".
  If the summary is multiple sentences or paragraphs, include ALL of it. Do NOT shorten or omit any part.
  Confidence 0.9+ if from an explicitly named section, 0.7 if inferred from position.
- headline: ONLY extract if a single standalone line exists that reads like a professional title (e.g., "Senior Java Developer | 8 Years Experience"). It must be ONE line, not a paragraph.
  If the resume has NO such standalone title line, set headline value to null and confidence to 0.0.
  Do NOT copy the summary into headline. Do NOT fabricate a headline from summary content. When in doubt, set to null.

## Experience vs Projects (CRITICAL)
- "Experience", "Work Experience", "Employment History", "Professional Experience" → experience entries (company-based employment with employer, dates, job title)
- "Projects", "Project Details", "Key Projects", "Academic Projects", "Side Projects", "Project Experience" → project entries
- If an entry has a company name + employment dates + job title → it is EXPERIENCE
- If an entry has a project name + description + technologies → it is a PROJECT
- Do NOT put project entries into the experience array. Do NOT put experience entries into the projects array.

## skills_used in Experience
- For each experience entry, extract the technologies/tools/environment used in that role as a plain array of strings in skills_used
- Look for "Environment:", "Technologies:", "Tech Stack:", "Tools Used:" labels within or after the experience description
- Example: "Environment: Java, Spring Boot, AWS, PostgreSQL" → skills_used: ["Java", "Spring Boot", "AWS", "PostgreSQL"]
- If no technologies section for that role, set skills_used to empty array []

## Declaration
- Indian resumes often include a declaration like "I hereby declare that all the statements are true..."
- If present, extract the FULL declaration text into the declaration field
- Common section names: "Declaration", "Affirmation", "Undertaking"

## Section Recognition (handle non-standard names)
- Projects: "Projects", "Projects Done", "Key Projects", "Academic Projects", "Side Projects", "Project Details", "Project Experience"
- Achievements: "Awards", "Achievements", "Accomplishments", "Honours", "Personal Strengths" (when it contains actual awards/rankings)
- Hobbies: "Hobbies", "Interests", "Personal Interests", "Extracurricular", "Extra-Curricular"
- Languages: "Languages", "Languages Known", "Language Proficiency"
- Publications: "Publications", "Papers", "Research", "Talks & Writing", "Blog Posts"
- Personal details: DOB, gender, nationality, marital status are common in Indian resumes/CVs/Biodata

## Resume Text
{resume_text}"""


def build_prompt(resume_text: str) -> str:
    return EXTRACTION_PROMPT.format(resume_text=resume_text)
