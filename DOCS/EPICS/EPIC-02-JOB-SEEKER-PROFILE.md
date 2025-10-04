# EPIC-02: Job Seeker Profile Management

## Epic Overview
Create a comprehensive profile management system for job seekers, including resume builder, document management, skill tracking, and AI-powered profile optimization.

---

## Business Value
- Enable job seekers to create attractive, comprehensive profiles
- Increase profile completion rates leading to better job matches
- Provide tools for profile optimization and improvement
- Support multiple resume formats and versions
- Enhance candidate discoverability for employers

---

## User Stories

### US-02.1: Create Basic Profile
**As a** job seeker
**I want to** create my basic profile with personal information
**So that** employers can learn about me

**Acceptance Criteria:**
- User can add personal information:
  - Full name (first, middle, last)
  - Date of birth
  - Gender (Male/Female/Other/Prefer not to say)
  - Current location (city, state, country, PIN code)
  - Contact details (email, phone, alternate phone)
- Profile photo upload with crop/resize functionality
- Real-time field validation
- Auto-save draft functionality
- Profile completion percentage indicator
- Data persisted securely in database

---

### US-02.2: Add Work Experience
**As a** job seeker
**I want to** add my work experience
**So that** employers can see my professional background

**Acceptance Criteria:**
- Add multiple work experience entries
- For each experience, capture:
  - Company name
  - Job title/designation
  - Employment type (Full-time/Part-time/Contract/Internship/Freelance)
  - Start date and end date (with "Currently working here" option)
  - Location (city, country)
  - Job description and responsibilities (rich text editor)
  - Key achievements (bullet points)
  - Skills used in this role (tag-based)
- Reorder experience entries (drag and drop)
- Edit or delete entries
- Work experience timeline visualization
- Calculate total years of experience automatically

---

### US-02.3: Add Education Details
**As a** job seeker
**I want to** add my educational qualifications
**So that** employers know my academic background

**Acceptance Criteria:**
- Add multiple education entries
- For each entry, capture:
  - Level of education (High School/Bachelor's/Master's/PhD/Diploma/Certificate)
  - Institution/University name
  - Degree/Course name
  - Field of study
  - Start and end dates (or expected graduation)
  - Percentage/CGPA
  - Honors/Awards (optional)
  - Relevant coursework (optional)
- Upload education certificates
- Reorder entries (most recent first by default)
- Edit or delete entries
- Verification badge for verified degrees (future)

---

### US-02.4: Add Skills
**As a** job seeker
**I want to** list my skills and proficiency levels
**So that** I can be matched with relevant jobs

**Acceptance Criteria:**
- Add skills with tag-based input (autocomplete from predefined skill list)
- Select proficiency level for each skill:
  - Beginner (0-1 year)
  - Intermediate (1-3 years)
  - Advanced (3-5 years)
  - Expert (5+ years)
- Categorize skills:
  - Technical skills
  - Soft skills
  - Language skills
  - Industry-specific skills
- Skill recommendations based on job category
- Reorder skills by importance
- Edit or remove skills
- Skill endorsements (future feature)
- Top 5 skills highlighted in profile summary

---

### US-02.5: Add Certifications & Licenses
**As a** job seeker
**I want to** showcase my certifications and licenses
**So that** I can demonstrate my qualifications

**Acceptance Criteria:**
- Add multiple certifications
- For each certification:
  - Certification name
  - Issuing organization
  - Issue date
  - Expiry date (or "Does not expire")
  - Credential ID/URL
  - Upload certificate (PDF/image)
- License details (for regulated professions):
  - License number
  - Issuing authority
  - Validity period
- Verification status (verified/pending)
- Expiry alerts for certifications
- Display on profile prominently

---

### US-02.6: Upload Resume/CV
**As a** job seeker
**I want to** upload my existing resume
**So that** I can use it for job applications

**Acceptance Criteria:**
- Upload resume in PDF or Word format (max 5MB)
- Multiple resume versions support (up to 5 resumes)
- Name each resume (e.g., "Software Engineer Resume", "Manager Resume")
- Set default resume for quick applications
- Preview resume in browser
- Download uploaded resume
- Delete old resume versions
- Resume virus scan before upload
- Replace existing resume

---

### US-02.7: Resume Builder
**As a** job seeker
**I want to** build a professional resume using templates
**So that** I can create an attractive CV without design skills

**Acceptance Criteria:**
- Step-by-step resume builder wizard
- Choose from 5-10 professional templates:
  - Fresher-friendly
  - Experienced professional
  - Creative/modern
  - Corporate/formal
  - Blue-collar/gig work
- Auto-populate data from profile
- Customize sections:
  - Personal details
  - Professional summary
  - Work experience
  - Education
  - Skills
  - Certifications
  - Projects
  - Languages
  - Hobbies (optional)
- Rich text formatting (bold, italic, bullet points)
- Live preview while editing
- Download as PDF (high quality)
- Download as Word document
- Share resume link
- ATS-friendly formatting option

---

### US-02.8: Job Preferences Settings
**As a** job seeker
**I want to** set my job preferences
**So that** I receive relevant job recommendations

**Acceptance Criteria:**
- Select preferred job types:
  - Full-time
  - Part-time
  - Gig/Freelance
  - Contract
  - Internship
  - Remote
  - Hybrid
- Preferred locations (multiple cities/states)
- Willing to relocate (Yes/No)
- Expected salary range (min-max with currency)
- Notice period (Immediate/15 days/1 month/2 months/3 months)
- Preferred industries/sectors (multi-select)
- Work shift preferences (Day/Night/Rotational)
- Job search status:
  - Actively looking
  - Open to opportunities
  - Not looking (profile still visible)
- Preferences used for job matching and recommendations

---

### US-02.9: Profile Visibility Settings
**As a** job seeker
**I want to** control who can see my profile
**So that** I can manage my privacy

**Acceptance Criteria:**
- Profile visibility options:
  - **Public:** Visible to all employers, searchable
  - **Private:** Only visible when applying to jobs, not searchable
  - **Semi-private:** Visible to verified employers only
- Hide profile from specific companies (block list)
- Anonymous mode (hide name and contact until shortlisted)
- Control what information is visible:
  - Contact details (show/hide phone)
  - Current employer (show/hide)
  - Salary expectations (show/hide)
- Profile visibility status displayed prominently
- Change visibility settings anytime
- Alert when profile viewed by employer

---

### US-02.10: Profile Completeness & Optimization
**As a** job seeker
**I want to** see my profile completion percentage and get suggestions
**So that** I can improve my profile quality

**Acceptance Criteria:**
- Profile completeness score (0-100%)
- Visual progress bar
- Checklist of missing sections:
  - [ ] Profile photo
  - [ ] Personal details
  - [ ] Work experience
  - [ ] Education
  - [ ] Skills (min 5)
  - [ ] Resume uploaded
  - [ ] Job preferences set
- Tips and suggestions to improve profile:
  - "Add a professional summary"
  - "List at least 5 skills"
  - "Upload a profile photo"
- Impact indicator (e.g., "80% complete profiles get 3x more views")
- Quick action buttons to complete missing sections
- Celebrate milestones (50%, 75%, 100% completion)

---

### US-02.11: AI-Powered Resume Parsing
**As a** job seeker
**I want** the system to auto-fill my profile from my uploaded resume
**So that** I save time on manual data entry

**Acceptance Criteria:**
- Upload resume (PDF/Word)
- AI parses and extracts:
  - Personal information (name, email, phone)
  - Work experience (companies, titles, dates, descriptions)
  - Education (degrees, institutions, dates)
  - Skills
  - Certifications
- Parsed data displayed for review
- User can edit/correct parsed data
- Confidence score for each extracted field
- Option to accept all or selectively accept fields
- Save to profile after confirmation
- Handle various resume formats and layouts
- Multi-language resume support (if applicable)

---

### US-02.12: Profile Preview & Public View
**As a** job seeker
**I want to** preview how my profile looks to employers
**So that** I can ensure it's presentable

**Acceptance Criteria:**
- "Preview Profile" button in edit mode
- Opens profile in read-only employer view
- Shows exactly what employers see
- Includes all sections (experience, education, skills, etc.)
- Responsive preview (desktop and mobile)
- "Edit Profile" button to go back
- Share profile link option (for public profiles)
- SEO-friendly profile URL (e.g., /profile/john-doe)

---

### US-02.13: Document Management
**As a** job seeker
**I want to** upload and manage my documents
**So that** I can attach them to applications

**Acceptance Criteria:**
- Upload various document types:
  - Resume/CV (PDF, Word)
  - Cover letters
  - Certificates
  - ID proofs (Aadhaar, PAN, Driving License)
  - Portfolio samples
- Categorize documents by type
- File size limit: 5MB per file
- Max 10 documents total
- View/download documents
- Delete documents
- Rename documents
- Virus scanning on upload
- Secure cloud storage
- Documents used in job applications

---

### US-02.14: Profile Promotion/Boosting
**As a** job seeker
**I want to** promote my profile for better visibility
**So that** I get more job opportunities

**Acceptance Criteria:**
- Option to boost profile (paid feature)
- Boosted profiles appear higher in employer searches
- Choose boost duration (7 days/15 days/30 days)
- Payment integration for boost purchase
- Boost status indicator on profile
- Boost expiry alert
- Analytics during boost period:
  - Profile views
  - Resume downloads by employers
  - Contact requests
- Boost renewal option

---

### US-02.15: Profile Analytics
**As a** job seeker
**I want to** see analytics about my profile
**So that** I can understand my visibility and engagement

**Acceptance Criteria:**
- Profile views count (daily/weekly/monthly)
- Who viewed your profile (employer names)
- Resume download count by employers
- Application-to-view ratio
- Profile search appearances
- Skills that are trending in your searches
- Suggestions to improve visibility
- Charts/graphs for trends over time
- Comparison with similar profiles (anonymized)

---

## Technical Requirements

### Database Schema

**Profiles Table:**
```sql
profiles (
  id: UUID PRIMARY KEY,
  user_id: UUID FOREIGN KEY REFERENCES users(id) UNIQUE,
  first_name: VARCHAR(100),
  middle_name: VARCHAR(100),
  last_name: VARCHAR(100),
  date_of_birth: DATE,
  gender: ENUM('male', 'female', 'other', 'not_specified'),
  phone: VARCHAR(20),
  alternate_phone: VARCHAR(20),
  address_line1: VARCHAR(255),
  address_line2: VARCHAR(255),
  city: VARCHAR(100),
  state: VARCHAR(100),
  country: VARCHAR(100),
  pin_code: VARCHAR(20),
  profile_photo: VARCHAR(500),
  professional_summary: TEXT,
  total_experience_years: DECIMAL(4,2),
  visibility: ENUM('public', 'private', 'semi_private'),
  is_profile_complete: BOOLEAN DEFAULT false,
  completion_percentage: INTEGER DEFAULT 0,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Work Experiences Table:**
```sql
work_experiences (
  id: UUID PRIMARY KEY,
  profile_id: UUID FOREIGN KEY REFERENCES profiles(id),
  company_name: VARCHAR(255),
  job_title: VARCHAR(255),
  employment_type: ENUM('full_time', 'part_time', 'contract', 'internship', 'freelance'),
  location: VARCHAR(255),
  is_current: BOOLEAN DEFAULT false,
  start_date: DATE,
  end_date: DATE,
  description: TEXT,
  achievements: TEXT,
  skills_used: JSONB,
  display_order: INTEGER,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Education Table:**
```sql
education (
  id: UUID PRIMARY KEY,
  profile_id: UUID FOREIGN KEY REFERENCES profiles(id),
  level: ENUM('high_school', 'bachelors', 'masters', 'phd', 'diploma', 'certificate'),
  institution: VARCHAR(255),
  degree: VARCHAR(255),
  field_of_study: VARCHAR(255),
  start_date: DATE,
  end_date: DATE,
  grade: VARCHAR(50),
  honors: TEXT,
  relevant_coursework: TEXT,
  certificate_url: VARCHAR(500),
  display_order: INTEGER,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Skills Table:**
```sql
skills (
  id: UUID PRIMARY KEY,
  name: VARCHAR(100) UNIQUE,
  category: ENUM('technical', 'soft', 'language', 'industry_specific'),
  is_active: BOOLEAN DEFAULT true
)

profile_skills (
  id: UUID PRIMARY KEY,
  profile_id: UUID FOREIGN KEY REFERENCES profiles(id),
  skill_id: UUID FOREIGN KEY REFERENCES skills(id),
  proficiency_level: ENUM('beginner', 'intermediate', 'advanced', 'expert'),
  years_of_experience: DECIMAL(4,1),
  display_order: INTEGER,
  created_at: TIMESTAMP
)
```

**Certifications Table:**
```sql
certifications (
  id: UUID PRIMARY KEY,
  profile_id: UUID FOREIGN KEY REFERENCES profiles(id),
  name: VARCHAR(255),
  issuing_organization: VARCHAR(255),
  issue_date: DATE,
  expiry_date: DATE,
  credential_id: VARCHAR(255),
  credential_url: VARCHAR(500),
  certificate_file: VARCHAR(500),
  is_verified: BOOLEAN DEFAULT false,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Resumes Table:**
```sql
resumes (
  id: UUID PRIMARY KEY,
  profile_id: UUID FOREIGN KEY REFERENCES profiles(id),
  file_name: VARCHAR(255),
  file_path: VARCHAR(500),
  file_size: INTEGER,
  file_type: ENUM('pdf', 'doc', 'docx'),
  resume_name: VARCHAR(255),
  is_default: BOOLEAN DEFAULT false,
  is_built_with_builder: BOOLEAN DEFAULT false,
  template_id: UUID,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Job Preferences Table:**
```sql
job_preferences (
  id: UUID PRIMARY KEY,
  profile_id: UUID FOREIGN KEY REFERENCES profiles(id) UNIQUE,
  job_types: JSONB,
  preferred_locations: JSONB,
  willing_to_relocate: BOOLEAN DEFAULT false,
  expected_salary_min: DECIMAL(10,2),
  expected_salary_max: DECIMAL(10,2),
  salary_currency: VARCHAR(10),
  notice_period: ENUM('immediate', '15_days', '1_month', '2_months', '3_months'),
  preferred_industries: JSONB,
  work_shift: ENUM('day', 'night', 'rotational', 'flexible'),
  job_search_status: ENUM('actively_looking', 'open_to_opportunities', 'not_looking'),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Profile Documents Table:**
```sql
profile_documents (
  id: UUID PRIMARY KEY,
  profile_id: UUID FOREIGN KEY REFERENCES profiles(id),
  document_type: ENUM('resume', 'cover_letter', 'certificate', 'id_proof', 'portfolio', 'other'),
  file_name: VARCHAR(255),
  file_path: VARCHAR(500),
  file_size: INTEGER,
  uploaded_at: TIMESTAMP
)
```

**Profile Views Table:**
```sql
profile_views (
  id: UUID PRIMARY KEY,
  profile_id: UUID FOREIGN KEY REFERENCES profiles(id),
  employer_id: UUID FOREIGN KEY REFERENCES users(id),
  viewed_at: TIMESTAMP,
  source: VARCHAR(100)
)
```

---

## API Endpoints

```
# Profile Management
GET    /api/v1/profile                    - Get current user's profile
POST   /api/v1/profile                    - Create profile
PUT    /api/v1/profile                    - Update profile
DELETE /api/v1/profile                    - Delete profile
GET    /api/v1/profile/:id/public         - Get public profile view
GET    /api/v1/profile/completion         - Get profile completion status

# Work Experience
GET    /api/v1/profile/experience         - List all experiences
POST   /api/v1/profile/experience         - Add experience
PUT    /api/v1/profile/experience/:id     - Update experience
DELETE /api/v1/profile/experience/:id     - Delete experience
PUT    /api/v1/profile/experience/reorder - Reorder experiences

# Education
GET    /api/v1/profile/education          - List all education
POST   /api/v1/profile/education          - Add education
PUT    /api/v1/profile/education/:id      - Update education
DELETE /api/v1/profile/education/:id      - Delete education

# Skills
GET    /api/v1/profile/skills             - List profile skills
POST   /api/v1/profile/skills             - Add skill
PUT    /api/v1/profile/skills/:id         - Update skill
DELETE /api/v1/profile/skills/:id         - Remove skill
GET    /api/v1/skills/suggestions         - Get skill suggestions

# Certifications
GET    /api/v1/profile/certifications     - List certifications
POST   /api/v1/profile/certifications     - Add certification
PUT    /api/v1/profile/certifications/:id - Update certification
DELETE /api/v1/profile/certifications/:id - Delete certification

# Resume
GET    /api/v1/profile/resumes            - List all resumes
POST   /api/v1/profile/resumes/upload     - Upload resume
GET    /api/v1/profile/resumes/:id        - Download resume
DELETE /api/v1/profile/resumes/:id        - Delete resume
PUT    /api/v1/profile/resumes/:id/default- Set as default resume
POST   /api/v1/profile/resumes/parse      - Parse and extract resume data

# Resume Builder
GET    /api/v1/resume-builder/templates   - Get resume templates
POST   /api/v1/resume-builder/build       - Build resume with template
GET    /api/v1/resume-builder/preview     - Preview resume
POST   /api/v1/resume-builder/download    - Download built resume

# Job Preferences
GET    /api/v1/profile/preferences        - Get job preferences
PUT    /api/v1/profile/preferences        - Update job preferences

# Profile Settings
PUT    /api/v1/profile/visibility         - Update visibility settings
POST   /api/v1/profile/boost              - Boost profile (paid)
GET    /api/v1/profile/analytics          - Get profile analytics
GET    /api/v1/profile/views              - Get profile views history

# Documents
GET    /api/v1/profile/documents          - List all documents
POST   /api/v1/profile/documents          - Upload document
DELETE /api/v1/profile/documents/:id      - Delete document
```

---

## AI/ML Integration

### Resume Parsing Service
- **Technology:** NLP-based parsing
- **Third-party options:** Sovren, RChilli, Affinda
- **Custom ML model:** TensorFlow/PyTorch (if building in-house)
- **Features:**
  - Text extraction from PDF/Word
  - Named Entity Recognition (NER)
  - Pattern matching for dates, emails, phones
  - Section classification (experience, education, skills)
  - Confidence scoring

---

## File Storage

### Cloud Storage
- **Service:** AWS S3, Azure Blob Storage, or Google Cloud Storage
- **Folder Structure:**
  ```
  /profiles/{user_id}/
    /photos/
    /resumes/
    /documents/
    /certificates/
  ```
- **Features:**
  - Secure signed URLs for downloads
  - Expiring upload URLs
  - CDN for fast delivery
  - Automatic backups
  - Virus scanning (ClamAV or third-party)

---

## UI/UX Requirements

### Profile Editing Interface
- Tabbed interface or multi-step wizard
- Auto-save every 30 seconds
- Real-time validation
- Responsive design (mobile, tablet, desktop)
- Drag-and-drop for reordering
- Rich text editors for descriptions
- Image cropping tool for profile photo
- File upload with drag-and-drop
- Progress indicators
- Tooltips and help text

### Profile Preview
- Clean, professional layout
- Print-friendly CSS
- PDF generation option
- Share link with unique URL
- QR code for profile (optional)

---

## Testing Requirements

### Unit Tests
- Profile CRUD operations
- Validation logic (email, phone, dates)
- File upload/download
- Resume parsing accuracy

### Integration Tests
- Complete profile creation flow
- Resume upload and parsing
- Profile visibility settings
- Analytics tracking

### UI/UX Tests
- Form validation
- Responsive design
- File upload UX
- Progress saving

---

## Success Metrics

- Profile creation completion rate > 80%
- Average profile completion percentage > 75%
- Resume upload rate > 60%
- Profile photo upload rate > 50%
- Resume parsing accuracy > 85%
- Profile view to application conversion > 15%

---

## Acceptance Criteria (Epic Level)

- [ ] Job seekers can create comprehensive profiles
- [ ] All profile sections functional (personal, experience, education, skills, certs)
- [ ] Multiple resume upload and management working
- [ ] Resume builder with templates functional
- [ ] Resume parsing accurately extracts data
- [ ] Job preferences can be set and updated
- [ ] Profile visibility controls working
- [ ] Profile completeness tracking accurate
- [ ] Document management functional
- [ ] Profile analytics tracking views and engagement
- [ ] Profile boost (paid feature) working
- [ ] All APIs documented and tested
- [ ] UI responsive and user-friendly
- [ ] Performance optimized (profile load < 2 seconds)

---

## Timeline Estimate
**Duration:** 5-6 weeks

### Week 1-2: Core Profile
- Database schema
- Basic profile CRUD
- Personal details, experience, education
- Skills management

### Week 3: Resume & Documents
- Resume upload
- Resume builder with templates
- Document management
- File storage integration

### Week 4: Advanced Features
- Resume parsing integration
- Job preferences
- Profile visibility settings
- Profile analytics

### Week 5: Optimization & Testing
- Profile completeness tracking
- Profile boost feature
- Comprehensive testing
- Performance optimization

### Week 6: Polish & Launch
- UI/UX refinement
- Bug fixes
- Documentation
- User acceptance testing

---

## Related Epics
- EPIC-01: User Authentication (prerequisite)
- EPIC-05: Job Search & Application (uses profile data)
- EPIC-09: AI Resume Parsing (integrated feature)

---

**Epic Owner:** Product Manager
**Stakeholders:** UX Designer, Backend Team, Frontend Team, Data Science Team
**Priority:** Critical (Core platform feature)
