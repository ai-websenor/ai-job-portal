// ── API Documentation ─────────────────────────────
// Lazy-loaded when user clicks the "API Docs" tab.

const BASE_URL = 'http://ai-job-portal-dev-alb-1152570158.ap-south-1.elb.amazonaws.com/ai';

// ── Shared Type Definitions ───────────────────────

const SHARED_TYPES = `ConfidenceField {
  value: string | null       // Extracted value (null if not found)
  confidence: number         // 0.0 - 1.0
}

PersonalInfo {
  name: ConfidenceField
  first_name: ConfidenceField
  last_name: ConfidenceField
  email: ConfidenceField
  phone: ConfidenceField
  address: ConfidenceField
  city: ConfidenceField
  state: ConfidenceField
  country: ConfidenceField
  linkedin: ConfidenceField
  github: ConfidenceField
  website: ConfidenceField
  summary: ConfidenceField
  headline: ConfidenceField
  date_of_birth: ConfidenceField
  gender: ConfidenceField
  nationality: ConfidenceField
  marital_status: ConfidenceField
}

Experience {
  company: ConfidenceField
  role: ConfidenceField
  location: ConfidenceField
  start_date: ConfidenceField
  end_date: ConfidenceField
  description: ConfidenceField
}

Education {
  institution: ConfidenceField
  degree: ConfidenceField
  field: ConfidenceField
  year: ConfidenceField
  grade: ConfidenceField
  description: ConfidenceField
}

Certification {
  name: ConfidenceField
  issuer: ConfidenceField
  year: ConfidenceField
}

Project {
  name: ConfidenceField
  description: ConfidenceField
  technologies: ConfidenceField
  url: ConfidenceField
}

Achievement {
  title: ConfidenceField
  year: ConfidenceField
}

Publication {
  title: ConfidenceField
  publisher: ConfidenceField
  year: ConfidenceField
  url: ConfidenceField
}

Language {
  name: ConfidenceField
  proficiency: ConfidenceField
}

ResumeOutput {
  personal: PersonalInfo
  experience: Experience[]
  education: Education[]
  skills: ConfidenceField[]
  certifications: Certification[]
  projects: Project[]
  achievements: Achievement[]
  publications: Publication[]
  languages: Language[]
  hobbies: ConfidenceField[]
}`;

// ── Endpoint Data ─────────────────────────────────

const API_DOCS = {
    baseUrl: BASE_URL,
    groups: [
        { id: 'getting-started', label: 'Getting Started' },
        { id: 'resume-parsing', label: 'Resume Parsing' },
        { id: 'chatbot', label: 'Chatbot' },
        { id: 'recommendations', label: 'Recommendations' },
    ],
    endpoints: [
        {
            id: 'parse',
            group: 'resume-parsing',
            method: 'POST',
            path: '/parse',
            title: 'Parse Resume (Upload)',
            description: 'Upload a PDF, DOCX or DOC file directly to extract structured resume data with confidence scores. The file is also saved to S3 automatically.',
            params: [
                { name: 'file', type: 'File (binary)', required: true, description: 'PDF, DOCX or DOC resume file (max 10MB)' }
            ],
            requestType: '// Content-Type: multipart/form-data\nfile: File  // PDF, DOCX or DOC, max 10MB',
            responseType: `{
  s3_uploaded: boolean
  personal: PersonalInfo
  experience: Experience[]
  education: Education[]
  skills: ConfidenceField[]
  certifications: Certification[]
  projects: Project[]
  achievements: Achievement[]
  publications: Publication[]
  languages: Language[]
  hobbies: ConfidenceField[]
}`,
            examples: {
                curl: `curl -X POST ${BASE_URL}/parse \\
  -F "file=@resume.pdf"`,
                python: `import requests

url = "${BASE_URL}/parse"
files = {"file": open("resume.pdf", "rb")}
response = requests.post(url, files=files)
data = response.json()

# Access parsed fields
print(data["personal"]["name"]["value"])       # "Arjun Sharma"
print(data["personal"]["name"]["confidence"])  # 0.95
print(data["skills"][0]["value"])               # "Python"`,
                javascript: `const form = new FormData();
form.append("file", fileInput.files[0]);

const res = await fetch("${BASE_URL}/parse", {
  method: "POST",
  body: form,
});
const data = await res.json();

// Access parsed fields
console.log(data.personal.name.value);       // "Arjun Sharma"
console.log(data.personal.name.confidence);  // 0.95
console.log(data.skills[0].value);           // "Python"`
            },
            sampleResponse: `{
  "s3_uploaded": true,
  "personal": {
    "name": { "value": "Arjun Sharma", "confidence": 0.95 },
    "email": { "value": "arjun@example.com", "confidence": 0.98 },
    "phone": { "value": "+919876543210", "confidence": 0.90 },
    "summary": { "value": "Senior developer with 6+ years...", "confidence": 0.90 },
    "headline": { "value": "Senior Full Stack Developer", "confidence": 0.85 }
  },
  "experience": [{
    "company": { "value": "TechCorp", "confidence": 0.92 },
    "role": { "value": "Senior Developer", "confidence": 0.95 },
    "start_date": { "value": "Jan 2020", "confidence": 0.88 },
    "end_date": { "value": "Present", "confidence": 0.90 }
  }],
  "skills": [
    { "value": "Python", "confidence": 0.95 },
    { "value": "React", "confidence": 0.92 }
  ]
}`,
            errors: [
                { code: 400, description: 'Unsupported file type or file exceeds 10MB' },
                { code: 422, description: 'Could not extract text or parse resume data' },
                { code: 503, description: 'AI service unavailable or timeout' },
            ]
        },
        {
            id: 'parse-s3',
            group: 'resume-parsing',
            method: 'POST',
            path: '/parse-s3',
            title: 'Parse Resume from S3',
            description: 'Parse a resume already stored in S3. Called by backend services with the S3 key after file upload. Optionally save parsed data to the database.',
            params: [
                { name: 's3_key', type: 'string', required: true, description: 'S3 key of the resume file (1-1024 chars, must end with .pdf, .docx or .doc, no path traversal)' },
                { name: 'user_id', type: 'string (UUID)', required: false, description: 'User UUID (required if save_to_db=true)' },
                { name: 'resume_id', type: 'string (UUID)', required: false, description: 'Resume UUID (required if save_to_db=true)' },
                { name: 'save_to_db', type: 'boolean', required: false, description: 'Save parsed data to parsed_resume_data table (default: false)' },
            ],
            requestType: `S3ParseRequest {
  s3_key: string             // required, 1-1024 chars
  user_id?: string           // UUID, required if save_to_db
  resume_id?: string         // UUID, required if save_to_db
  save_to_db?: boolean       // default: false
}`,
            responseType: `ResumeOutput {
  personal: PersonalInfo
  experience: Experience[]
  education: Education[]
  skills: ConfidenceField[]
  certifications: Certification[]
  projects: Project[]
  achievements: Achievement[]
  publications: Publication[]
  languages: Language[]
  hobbies: ConfidenceField[]
}`,
            examples: {
                curl: `# Basic parse (no DB save)
curl -X POST ${BASE_URL}/parse-s3 \\
  -H "Content-Type: application/json" \\
  -d '{
    "s3_key": "resumes/john-doe-resume.pdf"
  }'

# Parse and save to DB
curl -X POST ${BASE_URL}/parse-s3 \\
  -H "Content-Type: application/json" \\
  -d '{
    "s3_key": "resumes/john-doe-resume.pdf",
    "user_id": "d0000000-0000-0000-0000-000000000001",
    "resume_id": "f0000000-0000-0000-0000-000000000001",
    "save_to_db": true
  }'`,
                python: `import requests

url = "${BASE_URL}/parse-s3"

# Basic parse
response = requests.post(url, json={
    "s3_key": "resumes/john-doe-resume.pdf"
})
data = response.json()

# Parse and save to DB
response = requests.post(url, json={
    "s3_key": "resumes/john-doe-resume.pdf",
    "user_id": "d0000000-0000-0000-0000-000000000001",
    "resume_id": "f0000000-0000-0000-0000-000000000001",
    "save_to_db": True
})`,
                javascript: `// Basic parse
const res = await fetch("${BASE_URL}/parse-s3", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    s3_key: "resumes/john-doe-resume.pdf"
  }),
});
const data = await res.json();

// Parse and save to DB
const res2 = await fetch("${BASE_URL}/parse-s3", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    s3_key: "resumes/john-doe-resume.pdf",
    user_id: "d0000000-0000-0000-0000-000000000001",
    resume_id: "f0000000-0000-0000-0000-000000000001",
    save_to_db: true
  }),
});`
            },
            sampleResponse: `{
  "personal": {
    "name": { "value": "John Doe", "confidence": 0.95 },
    "email": { "value": "john@example.com", "confidence": 0.98 }
  },
  "experience": [{
    "company": { "value": "Acme Inc", "confidence": 0.92 },
    "role": { "value": "Software Engineer", "confidence": 0.95 }
  }],
  "skills": [
    { "value": "JavaScript", "confidence": 0.95 },
    { "value": "Node.js", "confidence": 0.90 }
  ]
}`,
            errors: [
                { code: 400, description: 'Unsupported file type (S3 key must end with .pdf, .docx or .doc)' },
                { code: 404, description: 'S3 file not found' },
                { code: 422, description: 'Could not extract text, invalid input, or parse failure' },
                { code: 503, description: 'AI service or storage unavailable' },
            ]
        },
        {
            id: 'chat',
            group: 'chatbot',
            method: 'POST',
            path: '/chat',
            title: 'Chat about a Job Listing',
            description: 'Candidate asks questions about a specific job listing. The chatbot answers based on job description, company details, salary, culture, and benefits. Multi-turn conversations are handled internally. Optionally provide user_id for personalized responses.',
            params: [
                { name: 'job_id', type: 'string (UUID)', required: true, description: 'Job listing UUID' },
                { name: 'message', type: 'string', required: true, description: "Candidate's question (1-2000 chars)" },
                { name: 'user_id', type: 'string (UUID)', required: false, description: 'User UUID for personalized responses (fetches candidate profile)' },
            ],
            requestType: `ChatRequest {
  job_id: string             // required, UUID
  message: string            // required, 1-2000 chars
  user_id?: string           // UUID, for personalization
}`,
            responseType: `ChatResponse {
  response: string           // AI response text
  messages: string[]         // Multi-bubble message array
  suggestions: string[]      // Follow-up question suggestions (max 3)
}`,
            examples: {
                curl: `curl -X POST ${BASE_URL}/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_id": "b0000000-0000-0000-0000-000000000001",
    "message": "What skills are required for this position?"
  }'

# With personalization (user profile)
curl -X POST ${BASE_URL}/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_id": "b0000000-0000-0000-0000-000000000001",
    "message": "Am I a good fit for this role?",
    "user_id": "d0000000-0000-0000-0000-000000000001"
  }'`,
                python: `import requests

url = "${BASE_URL}/chat"

# Ask about skills
response = requests.post(url, json={
    "job_id": "b0000000-0000-0000-0000-000000000001",
    "message": "What skills are required for this position?"
})
data = response.json()

print(data["response"])         # AI response
print(data["suggestions"])      # Follow-up questions

# Continue conversation (multi-turn handled internally)
response2 = requests.post(url, json={
    "job_id": "b0000000-0000-0000-0000-000000000001",
    "message": "What is the salary range?"
})`,
                javascript: `const res = await fetch("${BASE_URL}/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    job_id: "b0000000-0000-0000-0000-000000000001",
    message: "What skills are required for this position?"
  }),
});
const data = await res.json();

console.log(data.response);     // AI response
console.log(data.suggestions);  // Follow-up questions

// Continue conversation (multi-turn handled internally)
const res2 = await fetch("${BASE_URL}/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    job_id: "b0000000-0000-0000-0000-000000000001",
    message: "What is the salary range?"
  }),
});`
            },
            sampleResponse: `{
  "response": "This position requires JavaScript, React, Node.js, TypeScript, Python, and Redux. Strong problem-solving skills are also required.",
  "messages": [
    "This position requires JavaScript, React, Node.js, TypeScript, Python, and Redux.",
    "Strong problem-solving skills are also required."
  ],
  "suggestions": [
    "What is the salary range?",
    "Is remote work available?",
    "What is the company culture like?"
  ]
}`,
            errors: [
                { code: 422, description: 'Invalid input (bad UUID, empty message, message > 2000 chars)' },
                { code: 503, description: 'AI service or database unavailable' },
            ]
        },
        {
            id: 'recommend',
            group: 'recommendations',
            method: 'POST',
            path: '/recommend',
            title: 'Get Job Recommendations',
            description: 'Get LLM-ranked job recommendations for a user. user_id is required (fetches profile from DB). Optionally provide skills, experience, and location to further filter results. Returns top 10 matched jobs with relevance scores (0-100) and reasons.',
            params: [
                { name: 'user_id', type: 'string (UUID)', required: true, description: 'User UUID (fetches profile from DB)' },
                { name: 'skills', type: 'string[]', required: false, description: 'Skills filter (max 50 items, each max 100 chars)' },
                { name: 'experience_years', type: 'number', required: false, description: 'Years of experience (0-60)' },
                { name: 'location', type: 'string', required: false, description: 'Preferred location (max 200 chars)' },
                { name: 'save_to_db', type: 'boolean', required: false, description: 'Save recommendations to job_recommendations table (default: false)' },
            ],
            requestType: `RecommendRequest {
  user_id: string            // required, UUID
  skills?: string[]          // max 50, each max 100 chars
  experience_years?: number  // 0-60
  location?: string          // max 200 chars
  save_to_db?: boolean       // default: false
}`,
            responseType: `RecommendResponse {
  count: number
  recommendations: JobRecommendation[]
}

JobRecommendation {
  job_id: string             // UUID
  score: number              // 0-100 relevance score
  reason: string             // Why this job was recommended
  title: string
  company: string
  location: string
  skills: string[]
}`,
            examples: {
                curl: `# By user ID only (uses DB profile)
curl -X POST ${BASE_URL}/recommend \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "d0000000-0000-0000-0000-000000000001"
  }'

# With skills filter
curl -X POST ${BASE_URL}/recommend \\
  -H "Content-Type: application/json" \\
  -d '{
    "user_id": "d0000000-0000-0000-0000-000000000001",
    "skills": ["Python", "React", "JavaScript"],
    "experience_years": 3,
    "location": "Mumbai"
  }'`,
                python: `import requests

url = "${BASE_URL}/recommend"

# By user ID (uses DB profile)
response = requests.post(url, json={
    "user_id": "d0000000-0000-0000-0000-000000000001"
})
data = response.json()

print(f"Found {data['count']} recommendations")
for rec in data["recommendations"]:
    print(f"{rec['title']} at {rec['company']} - Score: {rec['score']}")
    print(f"  Reason: {rec['reason']}")

# With skills filter
response = requests.post(url, json={
    "user_id": "d0000000-0000-0000-0000-000000000001",
    "skills": ["Python", "React", "JavaScript"],
    "experience_years": 3,
    "location": "Mumbai"
})`,
                javascript: `// By user ID (uses DB profile)
const res = await fetch("${BASE_URL}/recommend", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: "d0000000-0000-0000-0000-000000000001"
  }),
});
const data = await res.json();

console.log(\`Found \${data.count} recommendations\`);
data.recommendations.forEach(rec => {
  console.log(\`\${rec.title} at \${rec.company} - Score: \${rec.score}\`);
});

// With skills filter
const res2 = await fetch("${BASE_URL}/recommend", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    user_id: "d0000000-0000-0000-0000-000000000001",
    skills: ["Python", "React", "JavaScript"],
    experience_years: 3,
    location: "Mumbai"
  }),
});`
            },
            sampleResponse: `{
  "count": 3,
  "recommendations": [
    {
      "job_id": "b0000000-0000-0000-0000-000000000001",
      "score": 92,
      "reason": "Strong match \u2014 JavaScript, React, TypeScript skills align perfectly with Senior Full Stack role",
      "title": "Senior Full Stack Developer",
      "company": "TechVista Solutions",
      "location": "Bangalore, Karnataka",
      "skills": ["JavaScript", "React", "Node.js", "TypeScript", "Python", "Redux"]
    },
    {
      "job_id": "b0000000-0000-0000-0000-000000000004",
      "score": 78,
      "reason": "Good frontend skill match, location differs",
      "title": "Frontend Developer (React)",
      "company": "DataDrive Analytics",
      "location": "Mumbai, Maharashtra",
      "skills": ["JavaScript", "React", "TypeScript", "CSS", "HTML", "Tailwind CSS"]
    }
  ]
}`,
            errors: [
                { code: 422, description: 'Invalid input (bad UUID, negative experience, > 50 skills)' },
                { code: 503, description: 'AI service or database unavailable' },
            ]
        }
    ]
};

// ── Rendering Functions ───────────────────────────

let _activeLang = 'curl';

function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderSidebar() {
    const sidebar = document.getElementById('docs-sidebar');
    let html = '';
    API_DOCS.groups.forEach(group => {
        html += `<div class="docs-group">${escHtml(group.label)}</div>`;
        if (group.id === 'getting-started') {
            html += `<a href="#docs-getting-started" data-doc-link="getting-started">Overview</a>`;
            html += `<a href="#docs-types" data-doc-link="types">Type Definitions</a>`;
        } else {
            API_DOCS.endpoints
                .filter(ep => ep.group === group.id)
                .forEach(ep => {
                    html += `<a href="#docs-${ep.id}" data-doc-link="${ep.id}">${ep.method} ${ep.path}</a>`;
                });
        }
    });
    sidebar.innerHTML = html;

    // Sidebar click handler
    sidebar.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-doc-link]');
        if (!link) return;
        e.preventDefault();
        const target = document.getElementById(link.getAttribute('href').slice(1));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

function renderTypeBlock(typeStr, label) {
    return `<div class="docs-type-block">
        <div class="docs-type-label">${escHtml(label)}</div>
        <pre class="docs-type-pre">${escHtml(typeStr)}</pre>
    </div>`;
}

function renderCodeBlock(examples, endpointId) {
    const langs = Object.keys(examples);
    const blockId = `code-${endpointId}`;

    let tabs = '<div class="docs-code-tabs">';
    langs.forEach(lang => {
        const label = lang === 'curl' ? 'cURL' : lang === 'python' ? 'Python' : 'JavaScript';
        const active = lang === _activeLang ? ' active' : '';
        tabs += `<button class="docs-code-tab${active}" data-lang="${lang}" data-block="${blockId}">${label}</button>`;
    });
    tabs += '</div>';

    let pres = '';
    langs.forEach(lang => {
        const display = lang === _activeLang ? 'block' : 'none';
        pres += `<pre class="docs-code-pre" data-block="${blockId}" data-lang="${lang}" style="display:${display}">${escHtml(examples[lang])}</pre>`;
    });

    return `<div class="docs-code-block" id="${blockId}">
        ${tabs}
        <button class="docs-copy-btn" data-block="${blockId}">Copy</button>
        ${pres}
    </div>`;
}

function renderParamsTable(params) {
    if (!params || !params.length) return '';
    let html = `<div class="docs-section-title">Parameters</div>
    <table class="docs-params">
        <thead><tr><th>Name</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>`;
    params.forEach(p => {
        const req = p.required ? '<span class="param-required">required</span>' : '';
        html += `<tr>
            <td><span class="param-name">${escHtml(p.name)}</span> ${req}</td>
            <td><span class="param-type">${escHtml(p.type)}</span></td>
            <td>${escHtml(p.description)}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    return html;
}

function renderErrorTable(errors) {
    if (!errors || !errors.length) return '';
    let html = `<div class="docs-section-title">Error Responses</div>
    <table class="docs-error-table">
        <thead><tr><th>Status</th><th>Description</th></tr></thead>
        <tbody>`;
    errors.forEach(e => {
        html += `<tr>
            <td><span class="docs-error-code">${e.code}</span></td>
            <td>${escHtml(e.description)}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    return html;
}

function renderGettingStarted() {
    return `
    <div id="docs-getting-started" class="docs-endpoint">
        <h2 style="font-size:1.25rem; font-weight:700; color:#1e293b; margin-bottom:16px;">Getting Started</h2>
        <div class="docs-2col">
            <div>
                <p class="docs-desc">
                    The AI Engine API provides resume parsing, job-contextual chatbot, and LLM-ranked job recommendations.
                    All endpoints are served under a single base URL.
                </p>
                <div class="docs-section-title">Base URL</div>
                <div class="docs-base-url">${escHtml(BASE_URL)}</div>
                <div class="docs-section-title">Authentication</div>
                <p class="docs-desc" style="margin-top:4px;">No authentication required for this prototype. All endpoints are open.</p>
                <div class="docs-section-title">Content Type</div>
                <p class="docs-desc" style="margin-top:4px;">
                    <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:0.8rem;">application/json</code> for all endpoints except <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:0.8rem;">/parse</code> which uses <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:0.8rem;">multipart/form-data</code>.
                </p>
                <div class="docs-section-title">AI Model</div>
                <p class="docs-desc" style="margin-top:4px;">Qwen2.5 3B on a private EC2 vLLM server. Responses vary by input size and model load.</p>
            </div>
            <div>
                <div class="docs-section-title">Quick Example</div>
                ${renderCodeBlock({
                    curl: `# Parse a resume
curl -X POST ${BASE_URL}/parse \\
  -F "file=@resume.pdf"

# Chat about a job
curl -X POST ${BASE_URL}/chat \\
  -H "Content-Type: application/json" \\
  -d '{
    "job_id": "JOB_UUID",
    "message": "What skills are needed?"
  }'`,
                    python: `import requests

# Parse a resume
res = requests.post(
    "${BASE_URL}/parse",
    files={"file": open("resume.pdf", "rb")}
)
print(res.json()["personal"]["name"]["value"])

# Chat about a job
res = requests.post("${BASE_URL}/chat", json={
    "job_id": "JOB_UUID",
    "message": "What skills are needed?"
})
print(res.json()["response"])`,
                    javascript: `// Parse a resume
const form = new FormData();
form.append("file", file);
const parsed = await fetch("${BASE_URL}/parse", {
  method: "POST", body: form
}).then(r => r.json());
console.log(parsed.personal.name.value);

// Chat about a job
const chat = await fetch("${BASE_URL}/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    job_id: "JOB_UUID",
    message: "What skills are needed?"
  })
}).then(r => r.json());
console.log(chat.response);`
                }, 'getting-started')}
            </div>
        </div>
    </div>

    <div id="docs-types" class="docs-endpoint">
        <h2 style="font-size:1.25rem; font-weight:700; color:#1e293b; margin-bottom:16px;">Type Definitions</h2>
        <div class="docs-2col">
            <div>
                <p class="docs-desc">
                    All resume parsing endpoints return data using a consistent type system. Every extracted field
                    is wrapped in a <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:0.8rem;">ConfidenceField</code>
                    containing the extracted value and a confidence score (0.0-1.0).
                </p>
                <p class="docs-desc">
                    A confidence of <strong style="color:#16a34a;">0.8+</strong> indicates high reliability,
                    <strong style="color:#ca8a04;">0.5-0.8</strong> moderate, and
                    <strong style="color:#dc2626;">below 0.5</strong> low confidence.
                    A value of <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:0.8rem;">null</code> with confidence 0.0 means the field was not found.
                </p>
            </div>
            <div>
                ${renderTypeBlock(SHARED_TYPES, 'Shared Types')}
            </div>
        </div>
    </div>`;
}

function renderEndpoints() {
    let html = renderGettingStarted();

    API_DOCS.endpoints.forEach(ep => {
        const methodClass = ep.method === 'POST' ? 'method-post' : 'method-get';

        html += `
        <div id="docs-${ep.id}" class="docs-endpoint">
            <div style="margin-bottom:16px;">
                <span class="method-badge ${methodClass}">${ep.method}</span>
                <span class="docs-path">${escHtml(ep.path)}</span>
            </div>
            <h3 style="font-size:1.1rem; font-weight:600; color:#1e293b; margin-bottom:8px;">${escHtml(ep.title)}</h3>
            <div class="docs-2col">
                <div>
                    <p class="docs-desc">${escHtml(ep.description)}</p>
                    ${renderTypeBlock(ep.requestType, 'Request')}
                    ${renderParamsTable(ep.params)}
                    ${renderTypeBlock(ep.responseType, 'Response')}
                    ${renderErrorTable(ep.errors)}
                </div>
                <div>
                    <div class="docs-section-title">Example Request</div>
                    ${renderCodeBlock(ep.examples, ep.id)}
                    <div class="docs-section-title" style="margin-top:24px;">Example Response</div>
                    <div class="docs-code-block">
                        <pre class="docs-code-pre">${escHtml(ep.sampleResponse)}</pre>
                        <button class="docs-copy-btn" data-response="${ep.id}">Copy</button>
                    </div>
                </div>
            </div>
        </div>`;
    });

    document.getElementById('docs-main').innerHTML = html;
}

// ── Event Handlers ────────────────────────────────

function setupCodeTabs() {
    document.getElementById('docs-main').addEventListener('click', (e) => {
        // Language tab switching
        const tab = e.target.closest('.docs-code-tab');
        if (tab) {
            const blockId = tab.dataset.block;
            const lang = tab.dataset.lang;
            _activeLang = lang;

            // Update all code blocks to reflect chosen language
            document.querySelectorAll('.docs-code-tab').forEach(t => {
                if (t.dataset.lang === lang) t.classList.add('active');
                else t.classList.remove('active');
            });
            document.querySelectorAll('.docs-code-pre[data-block]').forEach(pre => {
                if (pre.dataset.lang === lang) pre.style.display = 'block';
                else if (pre.dataset.lang) pre.style.display = 'none';
            });
            return;
        }

        // Copy button
        const copyBtn = e.target.closest('.docs-copy-btn');
        if (copyBtn) {
            let text;
            if (copyBtn.dataset.block) {
                const pre = document.querySelector(`pre.docs-code-pre[data-block="${copyBtn.dataset.block}"][data-lang="${_activeLang}"]`);
                text = pre ? pre.textContent : '';
            } else if (copyBtn.dataset.response) {
                const block = copyBtn.closest('.docs-code-block');
                const pre = block ? block.querySelector('.docs-code-pre') : null;
                text = pre ? pre.textContent : '';
            }
            if (text) {
                navigator.clipboard.writeText(text).then(() => {
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
                });
            }
            return;
        }
    });
}

function setupScrollSpy() {
    const sidebar = document.getElementById('docs-sidebar');
    const sections = document.querySelectorAll('.docs-endpoint');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id.replace('docs-', '');
                sidebar.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                const link = sidebar.querySelector(`a[data-doc-link="${id}"]`);
                if (link) link.classList.add('active');
            }
        });
    }, {
        root: document.getElementById('docs-main'),
        rootMargin: '-10% 0px -80% 0px',
        threshold: 0
    });

    sections.forEach(section => observer.observe(section));
}

// ── Init ──────────────────────────────────────────

(function init() {
    renderSidebar();
    renderEndpoints();
    setupCodeTabs();
    setupScrollSpy();

    // Activate first sidebar link
    const firstLink = document.querySelector('#docs-sidebar a');
    if (firstLink) firstLink.classList.add('active');
})();
