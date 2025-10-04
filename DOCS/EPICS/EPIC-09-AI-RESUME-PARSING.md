# EPIC-09: AI Resume Parsing & Analysis

## Epic Overview
Implement an intelligent AI-powered resume parsing system that automatically extracts structured data from uploaded resumes, fills profile fields, provides quality scoring, and offers improvement suggestions to enhance candidate profiles.

---

## Business Value
- Reduce candidate onboarding time
- Improve profile completeness and accuracy
- Enhance data quality for better job matching
- Provide value-added service to candidates
- Differentiate platform with AI capabilities
- Increase user satisfaction and engagement

---

## User Stories

### US-09.1: Resume Upload & Parsing
**As a** job seeker
**I want to** upload my resume and have it auto-parsed
**So that** I can quickly create my profile without manual data entry

**Acceptance Criteria:**
- Resume upload interface in profile creation/edit
- Supported file formats:
  - PDF (.pdf)
  - Microsoft Word (.doc, .docx)
  - Plain text (.txt)
  - RTF (.rtf)
- Maximum file size: 5MB
- Drag-and-drop upload
- File browser selection
- Upload progress indicator
- File preview before parsing

- Parsing process:
  - Upload file to server
  - Extract text from document
  - Apply NLP/AI parsing
  - Extract structured data
  - Map to profile fields
  - Show preview of extracted data

- Parsing typically extracts:
  - **Personal Information:**
    - Full name
    - Email address
    - Phone number
    - LinkedIn profile URL
    - Location (city, state, country)
    - Professional title/headline

  - **Work Experience:**
    - Company name
    - Job title
    - Start date and end date
    - Location
    - Job description/responsibilities
    - Achievements

  - **Education:**
    - Degree/qualification
    - Institution name
    - Field of study
    - Start and end dates
    - GPA/grades (if mentioned)

  - **Skills:**
    - Technical skills
    - Soft skills
    - Tools and technologies
    - Languages known

  - **Certifications:**
    - Certificate name
    - Issuing organization
    - Date obtained
    - Validity period

  - **Projects:**
    - Project name
    - Description
    - Technologies used
    - Duration
    - Team size

- Handle multiple resume formats:
  - Chronological
  - Functional
  - Combination
  - International formats

---

### US-09.2: Review & Edit Parsed Data
**As a** job seeker
**I want to** review and edit parsed data
**So that** I can correct any errors before saving

**Acceptance Criteria:**
- Parsing results displayed in preview mode
- Side-by-side view:
  - Left: Original resume (PDF viewer)
  - Right: Extracted data (editable form)

- Extracted data organized by sections:
  - Personal Information
  - Work Experience (timeline)
  - Education
  - Skills (tags)
  - Certifications
  - Projects
  - Additional Information

- Confidence scores displayed per field:
  - High confidence: Green checkmark
  - Medium confidence: Yellow warning
  - Low confidence: Red flag, manual review needed

- Edit capabilities:
  - Inline editing for each field
  - Add missing information
  - Remove incorrect data
  - Reorder items (drag-and-drop)
  - Format dates consistently

- Validation:
  - Required fields highlighted
  - Date format validation
  - Email and phone validation
  - URL validation

- Actions:
  - "Save Profile" button
  - "Re-parse Resume" (if errors)
  - "Cancel" (discard changes)
  - "Download Original Resume"

- Auto-save draft while editing
- Comparison with existing profile (if updating)
- Merge or replace option

---

### US-09.3: Resume Quality Score
**As a** job seeker
**I want to** see a quality score for my resume
**So that** I know how good my resume is

**Acceptance Criteria:**
- Resume quality score calculation (0-100):
  - **Completeness (30%):**
    - All required sections present
    - Adequate detail in each section
    - Contact information complete

  - **Clarity & Structure (25%):**
    - Clear section headings
    - Consistent formatting
    - Bullet points for responsibilities
    - Chronological order
    - No gaps in employment

  - **Keywords & Skills (25%):**
    - Relevant industry keywords
    - Technical skills mentioned
    - Action verbs used
    - Quantifiable achievements

  - **ATS Compatibility (20%):**
    - Standard section names
    - Simple formatting (no tables, columns in complex ways)
    - No headers/footers with critical info
    - Standard fonts

- Score display:
  - Numerical score (e.g., 78/100)
  - Letter grade (A, B, C, D, F)
  - Color-coded (Green/Yellow/Red)
  - Visual progress bar

- Score breakdown:
  - Show each factor's contribution
  - Identify strengths
  - Highlight weaknesses

- Industry benchmarking:
  - "Your score is above 65% of [Industry] candidates"
  - Compare to successful candidates

---

### US-09.4: Resume Improvement Suggestions
**As a** job seeker
**I want to** receive suggestions to improve my resume
**So that** I can make it more effective

**Acceptance Criteria:**
- AI-generated improvement suggestions:
  - **Content Suggestions:**
    - "Add quantifiable achievements (e.g., 'Increased sales by 30%')"
    - "Include keywords for [Target Role]"
    - "Expand on project descriptions"
    - "Add more technical skills relevant to [Industry]"

  - **Formatting Suggestions:**
    - "Use consistent date formats"
    - "Add section for certifications"
    - "Use bullet points instead of paragraphs"
    - "Reduce resume length (currently 3 pages, ideal 1-2)"

  - **ATS Optimization:**
    - "Avoid using tables for layout"
    - "Use standard section headings"
    - "Remove images and graphics"
    - "Simplify formatting for ATS compatibility"

  - **Grammar & Spelling:**
    - Identify spelling errors
    - Grammar issues
    - Suggest corrections

- Prioritized suggestions:
  - High impact (fix these first)
  - Medium impact
  - Low impact (nice to have)

- Actionable tips:
  - Specific, not generic
  - Examples provided
  - "Before and After" comparisons

- Suggestion categories:
  - Missing sections
  - Weak action verbs
  - Lack of metrics
  - Formatting issues
  - Keyword optimization
  - Length optimization

- "Apply Suggestion" button:
  - Auto-fix simple issues
  - Guide user for complex changes

- Track improvement over time:
  - Show score improvement after applying suggestions
  - "You improved your score by 15 points!"

---

### US-09.5: ATS Compatibility Check
**As a** job seeker
**I want to** check if my resume is ATS-compatible
**So that** it passes automated screening systems

**Acceptance Criteria:**
- ATS compatibility analyzer:
  - Parse resume as an ATS would
  - Identify issues that cause parsing errors

- ATS compatibility checks:
  - ✅ Standard file format (PDF, DOCX)
  - ✅ No complex formatting (tables, text boxes, columns)
  - ✅ Standard fonts (Arial, Calibri, Times New Roman)
  - ✅ Standard section headings (Experience, Education, Skills)
  - ✅ No headers/footers with critical information
  - ✅ No images, logos, or graphics
  - ✅ Contact info in main body (not header)
  - ✅ Consistent date formatting
  - ✅ No special characters or symbols

- ATS compatibility score (0-100%)
- Pass/Fail indicator with explanation
- List of issues found:
  - "Header contains email address (may not be parsed)"
  - "Table used for work experience (may cause errors)"
  - "Non-standard section heading 'Professional Journey'"

- "Generate ATS-Friendly Version" button:
  - Create simplified version
  - Strip complex formatting
  - Use standard sections
  - Plain text alternative

- Test with sample ATS systems
- Show how ATS sees the resume (text-only view)

---

### US-09.6: Skill Extraction & Matching
**As a** job seeker
**I want** my skills automatically extracted and matched to jobs
**So that** I get better job recommendations

**Acceptance Criteria:**
- AI skill extraction from resume:
  - Technical skills (programming languages, tools, frameworks)
  - Soft skills (leadership, communication, teamwork)
  - Domain expertise (industry-specific knowledge)
  - Certifications and licenses

- Skill categorization:
  - Primary skills (expertise level high)
  - Secondary skills (working knowledge)
  - Tools & technologies
  - Methodologies (Agile, Scrum, DevOps)

- Skill standardization:
  - Map variations to standard terms
    - "JavaScript" = "JS" = "ECMAScript"
    - "Machine Learning" = "ML"
  - Link to skill taxonomy/ontology

- Proficiency level detection:
  - Expert (based on years of experience, context)
  - Advanced
  - Intermediate
  - Beginner

- Skill suggestions:
  - "You mentioned Python. Consider adding: Django, Flask, NumPy"
  - Related skills commonly found together
  - Trending skills in your industry

- Skill gap analysis:
  - Compare your skills to target job requirements
  - Identify missing skills
  - Suggest learning resources

- Skill badges/endorsements (future):
  - Allow connections to endorse skills
  - Skill verification tests

---

### US-09.7: Experience & Education Parsing
**As a** job seeker
**I want** my work experience and education accurately extracted
**So that** my timeline is complete and correct

**Acceptance Criteria:**
- Work experience extraction:
  - Company name recognition
  - Job title identification
  - Date parsing (various formats):
    - "Jan 2020 - Dec 2022"
    - "01/2020 - 12/2022"
    - "2020 - 2022"
    - "January 2020 - Present"
  - Location extraction
  - Responsibilities (bullet points or paragraphs)
  - Achievements identification

- Experience duration calculation:
  - Total years of experience
  - Years per role
  - Current vs past positions
  - Employment gaps detection

- Education extraction:
  - Degree type (Bachelor's, Master's, PhD)
  - Field of study
  - Institution name
  - Graduation date
  - GPA/honors (if mentioned)

- Timeline visualization:
  - Chronological display
  - Overlap detection (part-time roles)
  - Gap highlighting

- Data validation:
  - Flag unrealistic dates (future dates, 100 years ago)
  - Overlapping full-time positions
  - Inconsistent date formats

- Company and institution recognition:
  - Autocomplete from database
  - Logo fetching
  - Industry tagging

---

### US-09.8: Multi-Language Resume Support
**As a** job seeker
**I want to** upload resumes in multiple languages
**So that** my regional resume is supported

**Acceptance Criteria:**
- Supported languages:
  - English
  - Hindi (Devanagari script)
  - Spanish
  - French
  - German
  - Chinese
  - Japanese
  - Arabic

- Language detection:
  - Auto-detect resume language
  - Multi-language resumes (sections in different languages)

- Language-specific parsing:
  - NLP models per language
  - Date format variations (DD/MM vs MM/DD)
  - Name parsing (different formats)

- Translation option (optional):
  - Translate resume to English
  - Preserve original content
  - Use for parsing if primary language parsing fails

- Character encoding support:
  - UTF-8 for all languages
  - Handle special characters

---

### US-09.9: Resume Version Management
**As a** job seeker
**I want to** manage multiple resume versions
**So that** I can use different resumes for different roles

**Acceptance Criteria:**
- Upload multiple resumes:
  - "General Resume"
  - "Technical Resume"
  - "Management Resume"
  - Custom names

- Set default resume for applications
- Select resume per job application
- Parse each resume separately
- Merge data from multiple resumes:
  - Union of all skills
  - All work experiences
  - Choose primary data source

- Version comparison:
  - Compare two resume versions
  - Highlight differences
  - Identify best version

- Delete resume version
- Download any version
- Re-parse any version

---

### US-09.10: Parsing Analytics (Admin)
**As a** platform administrator
**I want to** track parsing accuracy and performance
**So that** I can improve the AI model

**Acceptance Criteria:**
- Parsing analytics dashboard:
  - **Volume Metrics:**
    - Total resumes parsed
    - Resumes parsed per day/week/month
    - Peak parsing times

  - **Accuracy Metrics:**
    - Field extraction accuracy (per field type)
    - Overall parsing success rate
    - User corrections (indicates errors)
    - Confidence score distribution

  - **Performance Metrics:**
    - Average parsing time
    - Parsing failures
    - Error rate by file format
    - Error rate by resume format/style

  - **Quality Metrics:**
    - Average resume quality score
    - Distribution of scores (histogram)
    - ATS compatibility rate

- Error tracking:
  - Common parsing errors
  - Failed file formats
  - Unparsable resumes (for review)

- Model performance:
  - Precision and recall per field
  - F1 score
  - Comparison over time (model improvements)

- User feedback:
  - Corrections made by users
  - Negative feedback on parsing
  - Feature requests

- Export data for model retraining
- A/B testing different parsing models

---

### US-09.11: Resume Templates
**As a** job seeker
**I want to** download my profile as a formatted resume
**So that** I can use it for applications

**Acceptance Criteria:**
- Generate resume from profile:
  - Use profile data (parsed or manually entered)
  - Apply professional template
  - Output as PDF

- Template library:
  - Classic/Traditional template
  - Modern template
  - Minimalist template
  - Creative template
  - ATS-friendly template

- Customization:
  - Choose color scheme
  - Select fonts
  - Adjust spacing
  - Include/exclude sections
  - Reorder sections

- Template preview before download
- Download as PDF or DOCX
- Print-friendly format

- Pre-filled with:
  - Personal info
  - Work experience
  - Education
  - Skills
  - Certifications

---

### US-09.12: OCR for Scanned Resumes
**As a** job seeker
**I want to** upload scanned/image resumes
**So that** even my old paper resumes can be parsed

**Acceptance Criteria:**
- Supported image formats:
  - JPG, JPEG
  - PNG
  - TIFF
  - BMP

- OCR (Optical Character Recognition):
  - Convert image to text
  - Handle various scan qualities
  - Correct common OCR errors

- Image preprocessing:
  - Deskew (straighten tilted scans)
  - Noise reduction
  - Contrast enhancement

- Multi-page support:
  - Upload multi-page PDF (scanned)
  - Process each page
  - Combine text

- OCR quality check:
  - Confidence score
  - Suggest re-scan if quality too low
  - Manual review option

- OCR provider:
  - Google Cloud Vision API
  - AWS Textract
  - Azure Computer Vision
  - Tesseract OCR (open-source)

---

### US-09.13: Resume Keyword Optimization
**As a** job seeker
**I want** keyword suggestions for my target role
**So that** my resume matches job descriptions

**Acceptance Criteria:**
- Target role selection:
  - Choose desired job title
  - Industry/domain
  - Seniority level

- Keyword analysis:
  - Extract common keywords from target job postings
  - Identify must-have keywords
  - Nice-to-have keywords

- Keyword gap analysis:
  - Keywords in your resume: ✅
  - Missing keywords: ❌
  - Suggested additions

- Keyword density check:
  - Avoid keyword stuffing
  - Natural incorporation
  - Optimal frequency

- Industry-specific keywords:
  - Technical terms
  - Tools and technologies
  - Methodologies
  - Certifications

- Action verb suggestions:
  - "Led" instead of "Responsible for"
  - "Achieved" instead of "Worked on"
  - Strong, impactful verbs

---

### US-09.14: Privacy & Security
**As a** job seeker
**I want** my resume data to be secure
**So that** my personal information is protected

**Acceptance Criteria:**
- Resume storage security:
  - Encrypted storage (at rest)
  - Encrypted transmission (HTTPS/TLS)
  - Access control (only user can access)

- Data retention policy:
  - User can delete resumes anytime
  - Data deleted after account deletion
  - Parsed data retained separately (for profile)

- PII (Personally Identifiable Information) handling:
  - Email, phone, address secured
  - Not shared without consent
  - Comply with GDPR/CCPA

- Resume visibility controls:
  - Private (only user)
  - Visible to employers when applying
  - Public (searchable by recruiters)

- Data anonymization (for model training):
  - Remove PII before using for ML
  - Aggregated data only

- Audit logging:
  - Who accessed resume
  - When it was viewed
  - Download tracking

---

### US-09.15: Integration with Third-Party Parsing APIs
**As a** platform
**I want** to integrate with resume parsing APIs
**So that** we leverage best-in-class parsing technology

**Acceptance Criteria:**
- Supported parsing services:
  - Sovren
  - RChilli
  - Affinda
  - HireAbility
  - DaXtra
  - Custom in-house model

- Fallback mechanism:
  - Try primary service
  - If fails, try secondary service
  - Final fallback to basic parsing

- API integration:
  - RESTful API calls
  - Handle rate limits
  - Error handling and retries
  - Caching for performance

- Cost optimization:
  - Monitor API usage
  - Optimize calls (don't re-parse unnecessarily)
  - Use in-house model for simple resumes

- Response mapping:
  - Map third-party response to our schema
  - Standardize field names
  - Handle variations

- Service comparison:
  - A/B test different services
  - Track accuracy per service
  - Choose best performer

---

## Technical Requirements

### NLP & AI Stack
- **OCR:** Tesseract, Google Vision API, AWS Textract
- **NLP Libraries:** spaCy, NLTK, Stanford NLP
- **Named Entity Recognition (NER):** Custom-trained models
- **Text Extraction:** PyPDF2, pdfplumber, python-docx
- **Machine Learning:** scikit-learn, TensorFlow
- **Regular Expressions:** For pattern matching (emails, phones, dates)

### Database Schema

**Resumes Table:**
```sql
resumes (
  id: UUID PRIMARY KEY,
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  file_name: VARCHAR(255),
  file_url: VARCHAR(500),
  file_size: INTEGER,
  file_type: VARCHAR(50),
  version_name: VARCHAR(100),
  is_default: BOOLEAN DEFAULT false,
  parsing_status: ENUM('pending', 'processing', 'completed', 'failed'),
  parsed_at: TIMESTAMP,
  quality_score: DECIMAL(5,2),
  ats_score: DECIMAL(5,2),
  uploaded_at: TIMESTAMP
)
```

**Parsed Resume Data Table:**
```sql
parsed_resume_data (
  id: UUID PRIMARY KEY,
  resume_id: UUID FOREIGN KEY REFERENCES resumes(id),
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  personal_info: JSONB,
  work_experiences: JSONB,
  education: JSONB,
  skills: JSONB,
  certifications: JSONB,
  projects: JSONB,
  confidence_scores: JSONB,
  raw_text: TEXT,
  parsed_at: TIMESTAMP
)
```

**Resume Analysis Table:**
```sql
resume_analysis (
  id: UUID PRIMARY KEY,
  resume_id: UUID FOREIGN KEY REFERENCES resumes(id),
  quality_score: DECIMAL(5,2),
  quality_breakdown: JSONB,
  ats_score: DECIMAL(5,2),
  ats_issues: JSONB,
  suggestions: JSONB,
  keyword_matches: JSONB,
  analyzed_at: TIMESTAMP
)
```

---

## API Endpoints

```
# Resume Upload & Parsing
POST   /api/v1/resumes/upload            - Upload resume file
POST   /api/v1/resumes/:id/parse         - Trigger parsing
GET    /api/v1/resumes/:id               - Get resume details
GET    /api/v1/resumes/:id/parsed-data   - Get parsed data
PUT    /api/v1/resumes/:id/parsed-data   - Update parsed data
DELETE /api/v1/resumes/:id               - Delete resume

# Resume Analysis
GET    /api/v1/resumes/:id/quality-score - Get quality score
GET    /api/v1/resumes/:id/suggestions   - Get improvement suggestions
GET    /api/v1/resumes/:id/ats-check     - ATS compatibility check
GET    /api/v1/resumes/:id/keyword-analysis - Keyword analysis

# Resume Management
GET    /api/v1/resumes                   - List user's resumes
PUT    /api/v1/resumes/:id/set-default   - Set default resume
GET    /api/v1/resumes/:id/download      - Download resume file

# Resume Generation
POST   /api/v1/resumes/generate          - Generate resume from profile
GET    /api/v1/resume-templates          - List available templates

# Admin
GET    /api/v1/admin/parsing/analytics   - Parsing analytics
```

---

## UI/UX Requirements

### Resume Upload Page
- Drag-and-drop zone
- File browser button
- Progress bar during upload
- Supported formats displayed
- File size limit shown

### Parsing Results Page
- Split view (original resume + extracted data)
- PDF viewer (left)
- Editable form (right)
- Confidence indicators
- Save/Cancel buttons

### Quality Score Dashboard
- Large score display
- Score breakdown (pie/bar chart)
- Strengths and weaknesses
- Improvement suggestions list
- Progress tracking over time

---

## Testing Requirements

### Unit Tests
- Text extraction functions
- NER model accuracy
- Field mapping logic
- Score calculation algorithms

### Integration Tests
- File upload and storage
- Parsing API calls
- Database operations
- Resume generation

### Accuracy Tests
- Test on diverse resume samples
- Measure precision/recall per field
- Edge case handling
- Multi-language resumes

---

## Success Metrics

- Parsing accuracy (field-level) > 85%
- User satisfaction with parsing > 4.0/5
- Profile completion increase > 40% (vs manual entry)
- Time to complete profile reduced by 70%
- Resume upload rate > 60% of users
- Quality score utilization > 50% of users

---

## Acceptance Criteria (Epic Level)

- [ ] Resume upload functional for all supported formats
- [ ] AI parsing extracting all key fields accurately
- [ ] Parsed data displayed for review and editing
- [ ] Resume quality score calculated and displayed
- [ ] Improvement suggestions generated
- [ ] ATS compatibility check functional
- [ ] Skill extraction accurate
- [ ] Multiple resume versions supported
- [ ] OCR working for scanned resumes
- [ ] Keyword optimization functional
- [ ] Resume templates available
- [ ] Privacy and security measures implemented
- [ ] Admin analytics dashboard complete
- [ ] All APIs tested and documented

---

## Timeline Estimate
**Duration:** 4-5 weeks

### Week 1: Core Parsing
- File upload infrastructure
- Text extraction (PDF, DOCX)
- Basic NLP parsing
- Database schema

### Week 2: AI Enhancement
- NER model training
- Field extraction accuracy improvement
- Skill extraction
- Experience/education parsing

### Week 3: Analysis & Scoring
- Quality score algorithm
- ATS compatibility check
- Improvement suggestions
- Keyword analysis

### Week 4: Advanced Features
- OCR for scanned resumes
- Multi-language support
- Resume templates
- Multiple versions

### Week 5: Testing & Launch
- Accuracy testing
- User acceptance testing
- Performance optimization
- Documentation

---

## Related Epics
- EPIC-02: Job Seeker Profile (auto-fill profile from resume)
- EPIC-08: AI Job Recommendations (skills matching)
- EPIC-03: Job Search & Application (resume quality impacts applications)

---

**Epic Owner:** AI/ML Team Lead
**Stakeholders:** Product Manager, Backend Team, UX Designer
**Priority:** High (Key differentiator and UX improvement)
