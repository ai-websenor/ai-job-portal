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
    "name": {{"value": "string or null", "confidence": 0.0}},
    "email": {{"value": "string or null", "confidence": 0.0}},
    "phone": {{"value": "string or null", "confidence": 0.0}},
    "address": {{"value": "string or null", "confidence": 0.0}},
    "linkedin": {{"value": "string or null", "confidence": 0.0}}
  }},
  "experience": [
    {{
      "company": {{"value": "string or null", "confidence": 0.0}},
      "role": {{"value": "string or null", "confidence": 0.0}},
      "start_date": {{"value": "YYYY-MM or null", "confidence": 0.0}},
      "end_date": {{"value": "YYYY-MM or Present or null", "confidence": 0.0}},
      "description": {{"value": "brief summary or null", "confidence": 0.0}}
    }}
  ],
  "education": [
    {{
      "institution": {{"value": "string or null", "confidence": 0.0}},
      "degree": {{"value": "string or null", "confidence": 0.0}},
      "field": {{"value": "string or null", "confidence": 0.0}},
      "year": {{"value": "YYYY or null", "confidence": 0.0}}
    }}
  ],
  "skills": [
    {{"value": "string", "confidence": 0.0}}
  ],
  "certifications": [
    {{
      "name": {{"value": "string or null", "confidence": 0.0}},
      "issuer": {{"value": "string or null", "confidence": 0.0}},
      "year": {{"value": "YYYY or null", "confidence": 0.0}}
    }}
  ]
}}
```

## Rules
- Return ONLY the JSON object, no markdown, no explanation
- Dates: use YYYY-MM format (e.g., 2020-01). If only year, use YYYY-01
- If currently employed, end_date value = "Present"
- Missing fields: value = null, confidence = 0.0
- Skills: extract individual skills, not categories
- Phone: include country code if visible
- List experience and education in reverse chronological order

## Resume Text
{resume_text}"""


def build_prompt(resume_text: str) -> str:
    return EXTRACTION_PROMPT.format(resume_text=resume_text)
