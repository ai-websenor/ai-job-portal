# EPIC-04: Employer Job Posting & Management

## Epic Overview
Build a comprehensive job posting system for employers with AI-powered JD assistance, applicant tracking, interview scheduling, and team collaboration features.

---

## Business Value
- Enable employers to post jobs quickly and efficiently
- Increase job posting quality with AI assistance
- Streamline applicant management workflow
- Facilitate hiring collaboration across teams
- Generate revenue through paid job posting plans

---

## User Stories

### US-04.1: Create Company Profile
**As an** employer
**I want to** create my company profile
**So that** candidates can learn about my organization

**Acceptance Criteria:**
- Company profile form with sections:
  - **Basic Information:**
    - Company name
    - Industry/Sector (dropdown)
    - Company size (dropdown: 1-10, 11-50, 51-200, 201-500, 500+)
    - Year established
    - Company type (Startup/SME/MNC/Government)
  - **Contact Details:**
    - Business email
    - Phone number
    - Website URL
    - Office address (multiple locations support)
  - **Branding:**
    - Company logo upload (max 2MB, PNG/JPG)
    - Cover banner image (optional)
    - Company tagline
  - **Description:**
    - About company (rich text, max 2000 words)
    - Mission and vision
    - Company culture
    - Benefits and perks
  - **Social Links:**
    - LinkedIn, Facebook, Twitter, Instagram
- Logo image cropping tool
- Preview company page
- Save as draft
- Publish profile
- Public company page at /company/[company-name]
- SEO-friendly company URL

---

### US-04.2: Company Verification (KYC)
**As an** employer
**I want to** verify my company with official documents
**So that** candidates trust my job postings

**Acceptance Criteria:**
- Upload verification documents:
  - PAN card (mandatory)
  - GST certificate (if applicable)
  - Company registration certificate
  - Authorized signatory ID proof
  - Office address proof
- Document upload with preview
- Submission confirmation
- Admin review notification
- Verification status: Pending/Verified/Rejected
- Verified badge on company profile and jobs
- Re-submission if rejected (with reason from admin)
- Email notification on verification approval/rejection

---

### US-04.3: Create Job Posting (Basic)
**As an** employer
**I want to** post a job opening
**So that** candidates can apply

**Acceptance Criteria:**
- Job posting form with sections:

  **Job Details:**
  - Job title (autocomplete suggestions)
  - Job category/department (dropdown)
  - Number of openings (default 1)
  - Job reference ID (auto-generated or custom)

  **Job Type & Work Mode:**
  - Job type: Full-time/Part-time/Contract/Freelance/Internship/Gig
  - Work mode: Office/Remote/Hybrid
  - Employment category: Corporate/Blue-collar

  **Job Description:**
  - Rich text editor with formatting
  - Role overview (required)
  - Key responsibilities (bullet points)
  - Required skills (tag input with autocomplete)
  - Preferred skills (tag input)
  - Required qualifications (education, experience)
  - Preferred qualifications

  **Experience & Education:**
  - Minimum experience (years, or Fresher option)
  - Maximum experience
  - Education level required
  - Specific degrees/certifications

  **Compensation:**
  - Salary range (min-max)
  - Currency selection
  - Hide/show salary option
  - Salary negotiable checkbox
  - Benefits (multi-select: Health insurance, PF, Bonus, etc.)

  **Location:**
  - Job location (city, state)
  - Multiple locations option
  - Remote work available

  **Application Settings:**
  - Application deadline (date picker)
  - Auto-close when filled (checkbox)
  - Maximum applications limit (optional)

- Form validation (required fields)
- Auto-save as draft every 30 seconds
- Character count for description
- Preview job posting
- Publish immediately or schedule

---

### US-04.4: AI-Powered JD Assistance
**As an** employer
**I want** AI to help me write effective job descriptions
**So that** I can create better job postings faster

**Acceptance Criteria:**
- "Get AI Suggestions" button in JD editor
- AI features:

  **Based on Job Title:**
  - Enter job title → AI suggests:
    - Common responsibilities
    - Required skills
    - Typical qualifications
    - Salary range (market data)

  **Upload Existing JD:**
  - Upload PDF/Word JD document
  - AI parses and auto-fills form fields
  - Extract job title, description, skills, etc.

  **Keyword Suggestions:**
  - AI recommends relevant keywords for better visibility
  - Industry-specific terms
  - Popular search terms

  **Content Enhancement:**
  - Grammar and spell check
  - Readability score
  - Gender-neutral language suggestions
  - Clarity improvements

  **JD Quality Score:**
  - Score out of 100
  - Feedback on completeness
  - Missing sections alert
  - Competitive benchmarking

- Accept/reject AI suggestions
- Edit AI-generated content
- JD quality improves application rates

---

### US-04.5: Screening Questions
**As an** employer
**I want to** add screening questions to my job posting
**So that** I can filter candidates efficiently

**Acceptance Criteria:**
- Add screening questions section
- Question types:
  - Multiple choice (MCQ with 2-6 options)
  - Text-based (short answer or paragraph)
  - Yes/No questions
  - Rating scale (1-5)
- Add up to 10 questions
- Mark questions as mandatory
- Set correct/preferred answers (for MCQ)
- Reorder questions (drag-and-drop)
- Question templates library
- Preview questions as candidate sees
- Answers visible in applicant view
- Filter applicants by answers

---

### US-04.6: Job Posting Payment
**As an** employer
**I want to** pay for job posting
**So that** my job goes live on the platform

**Acceptance Criteria:**
- After completing job form, redirect to payment
- Show pricing plan selection:
  - Free (if available, limited features)
  - Basic job post (standard listing)
  - Featured job post (highlighted)
  - Premium job post (featured + urgent badge)
- Display plan features and pricing
- Select plan and proceed to payment
- Razorpay payment gateway integration
- Payment methods: Card/UPI/Net Banking/Wallets
- Secure payment process (PCI-DSS compliant)
- Payment success confirmation
- Auto-generate GST invoice
- Email invoice to employer
- Job goes live immediately after payment
- Payment recorded in transaction history
- Failed payment retry option

---

### US-04.7: Job Listing Management
**As an** employer
**I want to** manage all my posted jobs
**So that** I can track and control my listings

**Acceptance Criteria:**
- "My Jobs" dashboard for employer
- Job listing with filters:
  - Status: Active / Expired / Closed / Draft
  - Date posted
  - Search by job title
- Job cards showing:
  - Job title
  - Status badge
  - Posted date
  - Application deadline
  - Number of applications
  - Views count
  - Actions (Edit, View, Close, Renew, Delete)
- Click job card to view details
- Edit active jobs (limited fields after publishing)
- Close job early (mark as filled)
- Delete draft jobs
- Renew expired jobs (pay again)
- Clone job posting (duplicate and edit)
- Bulk actions (close multiple, delete multiple)
- Export job list to CSV

---

### US-04.8: View Applicants
**As an** employer
**I want to** view all candidates who applied to my job
**So that** I can review and shortlist them

**Acceptance Criteria:**
- Applicants page per job
- Applicant list with:
  - Candidate name and photo
  - Current job title
  - Location
  - Experience (years)
  - Skills match percentage (AI-based)
  - Application date
  - Status badge (Applied/Viewed/Shortlisted/Rejected)
  - Actions (View Profile, Shortlist, Reject, Message)
- Filter applicants:
  - By status
  - By skills match
  - By experience range
  - By location
  - By application date
- Sort applicants:
  - Best match (skills-based AI ranking)
  - Most recent
  - Experience (high to low)
- Search applicants by name
- Bulk actions (shortlist/reject multiple)
- Applicant count by status (sidebar stats)

---

### US-04.9: Candidate Profile View (Employer Side)
**As an** employer
**I want to** view detailed candidate profile
**So that** I can evaluate their fit for the role

**Acceptance Criteria:**
- Click applicant to open detailed view
- Candidate profile includes:
  - **Header:**
    - Name, photo
    - Current job title
    - Location
    - Contact details (email, phone)
    - LinkedIn profile link
  - **Match Score:**
    - Overall match percentage
    - Breakdown (Skills: 90%, Experience: 85%, Location: 100%)
  - **Resume:**
    - View resume in browser (PDF viewer)
    - Download resume button
  - **Work Experience:**
    - Timeline view
    - Company, title, duration, description
  - **Education:**
    - Degrees, institutions, dates
  - **Skills:**
    - All listed skills with proficiency
    - Matching skills highlighted
  - **Certifications:**
    - Certificates with validity
  - **Application Details:**
    - Cover letter (if submitted)
    - Screening question answers
    - Additional documents
    - Application date
- Video profile player (if uploaded)
- Notes section (private, employer-only)
- Rating (1-5 stars)
- Tags (custom labels)
- Action buttons: Shortlist, Reject, Schedule Interview, Message

---

### US-04.10: Shortlist/Reject Candidates
**As an** employer
**I want to** shortlist or reject candidates
**So that** I can move promising candidates forward

**Acceptance Criteria:**
- **Shortlist Candidate:**
  - Click "Shortlist" button
  - Candidate status changes to "Shortlisted"
  - Candidate receives email/push notification
  - Candidate appears in "Shortlisted" filter
  - Option to add shortlist reason/notes

- **Reject Candidate:**
  - Click "Reject" button
  - Confirmation modal:
    - Select rejection reason (dropdown):
      - Insufficient experience
      - Skills mismatch
      - Location constraints
      - Overqualified
      - Position filled
      - Other (text field)
    - Optional: Send rejection email to candidate
  - Candidate status changes to "Rejected"
  - Candidate removed from active applicants (moved to rejected)
  - Rejection email sent (if opted)

- Bulk shortlist/reject option
- Undo action (within 5 minutes)
- Analytics on rejection reasons

---

### US-04.11: Interview Scheduling
**As an** employer
**I want to** schedule interviews with candidates
**So that** I can move forward with hiring

**Acceptance Criteria:**
- "Schedule Interview" button on candidate profile
- Interview scheduling form:
  - Select candidate(s) (can schedule for multiple)
  - Select job posting
  - Interview round (Screening/Technical/HR/Final)
  - Interview mode: In-person/Phone/Video call
  - Interview date and time (date-time picker)
  - Duration (30 min/1 hour/2 hours)
  - Interview location (if in-person) or meeting link (if virtual)
  - Interviewer name(s)
  - Add interview panel (multiple interviewers)
  - Interview instructions for candidate
  - Required documents (if any)
- Calendar integration:
  - Add to Google Calendar
  - Add to Outlook Calendar
  - Generate .ics file
- Send interview invite to candidate:
  - Email with interview details
  - Calendar invite attachment
  - Meeting link (if video)
  - Add to candidate's calendar
- Automated reminders:
  - 24 hours before interview (email + SMS + WhatsApp)
  - 2 hours before interview (email + push)
- Candidate can confirm/reschedule
- Interview status tracking:
  - Scheduled / Confirmed / Completed / Rescheduled / Canceled / No-show
- Reschedule/cancel interview:
  - Notify candidate immediately
  - Update calendar events
- Post-interview feedback form

---

### US-04.12: Applicant Notes & Tags
**As an** employer
**I want to** add private notes and tags to candidates
**So that** I can organize and remember details

**Acceptance Criteria:**
- Notes section on candidate profile (employer-only view)
- Add/edit/delete notes
- Timestamp and author for each note
- Rich text formatting for notes
- Tag candidates with custom labels:
  - "Top candidate"
  - "Second round"
  - "Reference check pending"
  - "Consider for future"
  - Custom tags (create new)
- Color-coded tags
- Filter applicants by tags
- Search notes

---

### US-04.13: Team Collaboration
**As an** employer
**I want** my team members to collaborate on hiring
**So that** we can make better decisions together

**Acceptance Criteria:**
- Add team members to employer account:
  - Send email invitations
  - Assign roles:
    - Admin (full access)
    - Recruiter (post jobs, manage applicants)
    - Interviewer (view applicants, add feedback)
    - Viewer (read-only access)
- Role-based permissions enforced
- Team members can:
  - View job postings
  - View applicants
  - Add notes and ratings
  - @mention team members in notes
  - Assign tasks ("Review John's profile by Friday")
  - Set reminders
- Activity log:
  - Who viewed candidate
  - Who shortlisted/rejected
  - Who scheduled interview
  - Timestamp for all actions
- Comment threads on candidate profiles
- Notification when @mentioned or assigned task
- Task dashboard for team members
- Audit trail for compliance

---

### US-04.14: Download Bulk Resumes
**As an** employer
**I want to** download multiple resumes at once
**So that** I can review them offline

**Acceptance Criteria:**
- Select multiple applicants (checkboxes)
- "Download Selected Resumes" button
- Choose download format:
  - Individual PDFs (ZIP file)
  - Merged PDF (all resumes in one file)
- File names: [CandidateName]_[JobTitle]_Resume.pdf
- Download progress indicator
- Max 50 resumes per download
- Download limit based on subscription plan
- Track download count per employer (analytics)

---

### US-04.15: Messaging with Candidates
**As an** employer
**I want to** message candidates directly
**So that** I can communicate about the application

**Acceptance Criteria:**
- "Send Message" button on candidate profile
- Messaging interface:
  - Pre-filled subject: "Re: [Job Title] Application"
  - Message text area (rich text editor)
  - Attach files option
  - Message templates (common responses)
- Send message
- Message delivered to candidate's inbox
- Candidate receives email + push notification
- Thread-based conversation
- View message history
- Mark as read/unread
- Search messages
- Bulk messaging (send to multiple candidates)
- Track response rate

---

### US-04.16: Job Posting Analytics
**As an** employer
**I want to** see analytics for my job postings
**So that** I can optimize my hiring strategy

**Acceptance Criteria:**
- Analytics dashboard per job:
  - **Visibility Metrics:**
    - Total views
    - Unique visitors
    - Views over time (chart)
    - Traffic sources (search/homepage/email/direct)

  - **Application Metrics:**
    - Total applications
    - Applications over time (chart)
    - View to application conversion rate
    - Average time to apply

  - **Candidate Quality:**
    - Average skills match percentage
    - Experience distribution (fresher/mid/senior)
    - Location distribution
    - Top candidate sources

  - **Engagement:**
    - Job saves count
    - Job shares count
    - Share channels breakdown

  - **Hiring Funnel:**
    - Applied → Shortlisted → Interview → Hired (funnel chart)
    - Drop-off at each stage

  - **Time Metrics:**
    - Time to first application
    - Average time to hire
    - Days active

- Compare jobs (side-by-side analytics)
- Export analytics to PDF/CSV
- Insights and recommendations
- Benchmark against similar jobs

---

## Technical Requirements

### Database Schema

**Companies Table:**
```sql
companies (
  id: UUID PRIMARY KEY,
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  name: VARCHAR(255),
  slug: VARCHAR(255) UNIQUE,
  industry: VARCHAR(100),
  company_size: ENUM('1-10', '11-50', '51-200', '201-500', '500+'),
  year_established: INTEGER,
  company_type: ENUM('startup', 'sme', 'mnc', 'government'),
  website: VARCHAR(500),
  description: TEXT,
  mission: TEXT,
  culture: TEXT,
  benefits: JSONB,
  logo_url: VARCHAR(500),
  banner_url: VARCHAR(500),
  tagline: VARCHAR(255),
  is_verified: BOOLEAN DEFAULT false,
  verification_status: ENUM('pending', 'verified', 'rejected'),
  verification_documents: JSONB,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Jobs Table** (already defined in EPIC-03, with additions):
```sql
-- Additional fields:
employer_notes: TEXT,
screening_questions: JSONB,
auto_close_when_filled: BOOLEAN DEFAULT false,
max_applications: INTEGER,
plan_type: ENUM('free', 'basic', 'featured', 'premium'),
payment_id: UUID FOREIGN KEY REFERENCES payments(id),
```

**Team Members Table:**
```sql
team_members (
  id: UUID PRIMARY KEY,
  company_id: UUID FOREIGN KEY REFERENCES companies(id),
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  role: ENUM('admin', 'recruiter', 'interviewer', 'viewer'),
  invited_by: UUID FOREIGN KEY REFERENCES users(id),
  invited_at: TIMESTAMP,
  joined_at: TIMESTAMP,
  is_active: BOOLEAN DEFAULT true,
  created_at: TIMESTAMP
)
```

**Interviews Table:**
```sql
interviews (
  id: UUID PRIMARY KEY,
  application_id: UUID FOREIGN KEY REFERENCES applications(id),
  job_id: UUID FOREIGN KEY REFERENCES jobs(id),
  candidate_id: UUID FOREIGN KEY REFERENCES users(id),
  scheduled_by: UUID FOREIGN KEY REFERENCES users(id),
  interview_round: ENUM('screening', 'technical', 'hr', 'final'),
  interview_mode: ENUM('in_person', 'phone', 'video'),
  interview_date: TIMESTAMP,
  duration_minutes: INTEGER,
  location: VARCHAR(255),
  meeting_link: VARCHAR(500),
  interviewers: JSONB,
  instructions: TEXT,
  status: ENUM('scheduled', 'confirmed', 'completed', 'rescheduled', 'canceled', 'no_show'),
  feedback: TEXT,
  rating: INTEGER,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Applicant Notes Table:**
```sql
applicant_notes (
  id: UUID PRIMARY KEY,
  application_id: UUID FOREIGN KEY REFERENCES applications(id),
  author_id: UUID FOREIGN KEY REFERENCES users(id),
  note: TEXT,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Applicant Tags Table:**
```sql
applicant_tags (
  id: UUID PRIMARY KEY,
  application_id: UUID FOREIGN KEY REFERENCES applications(id),
  tag: VARCHAR(100),
  color: VARCHAR(20),
  created_by: UUID FOREIGN KEY REFERENCES users(id),
  created_at: TIMESTAMP
)
```

---

## API Endpoints

```
# Company Profile
POST   /api/v1/employer/company           - Create company profile
GET    /api/v1/employer/company           - Get company profile
PUT    /api/v1/employer/company           - Update company profile
POST   /api/v1/employer/company/verify    - Submit verification documents
GET    /api/v1/company/:slug              - Public company page

# Job Posting
POST   /api/v1/employer/jobs              - Create job post
GET    /api/v1/employer/jobs              - List employer's jobs
GET    /api/v1/employer/jobs/:id          - Get job details
PUT    /api/v1/employer/jobs/:id          - Update job post
DELETE /api/v1/employer/jobs/:id          - Delete job
POST   /api/v1/employer/jobs/:id/close    - Close job
POST   /api/v1/employer/jobs/:id/renew    - Renew expired job
POST   /api/v1/employer/jobs/:id/clone    - Clone job posting

# AI JD Assistance
POST   /api/v1/employer/jd/suggestions    - Get AI JD suggestions
POST   /api/v1/employer/jd/parse          - Parse uploaded JD document
POST   /api/v1/employer/jd/score          - Get JD quality score

# Applicant Management
GET    /api/v1/employer/jobs/:id/applicants       - List job applicants
GET    /api/v1/employer/applications/:id          - Get applicant details
PUT    /api/v1/employer/applications/:id/shortlist- Shortlist candidate
PUT    /api/v1/employer/applications/:id/reject   - Reject candidate
POST   /api/v1/employer/applications/bulk-action  - Bulk shortlist/reject

# Notes & Tags
POST   /api/v1/employer/applications/:id/notes    - Add note
GET    /api/v1/employer/applications/:id/notes    - List notes
POST   /api/v1/employer/applications/:id/tags     - Add tag
DELETE /api/v1/employer/applications/:id/tags/:tagId - Remove tag

# Interview Scheduling
POST   /api/v1/employer/interviews        - Schedule interview
GET    /api/v1/employer/interviews        - List interviews
PUT    /api/v1/employer/interviews/:id    - Update interview
DELETE /api/v1/employer/interviews/:id    - Cancel interview

# Team Management
POST   /api/v1/employer/team              - Invite team member
GET    /api/v1/employer/team              - List team members
PUT    /api/v1/employer/team/:id          - Update member role
DELETE /api/v1/employer/team/:id          - Remove team member

# Messaging
POST   /api/v1/employer/messages          - Send message to candidate
GET    /api/v1/employer/messages          - List conversations
GET    /api/v1/employer/messages/:threadId- Get conversation thread

# Analytics
GET    /api/v1/employer/jobs/:id/analytics- Get job analytics
GET    /api/v1/employer/dashboard/stats   - Get employer dashboard stats

# Bulk Operations
POST   /api/v1/employer/resumes/download  - Bulk download resumes
```

---

## AI/ML Integration

### JD Assistance AI
- **NLP Services:** Google Cloud Natural Language API, AWS Comprehend, or Azure Text Analytics
- **Pre-trained Models:** GPT-3/4 for text generation (job description suggestions)
- **Custom Models:** Train on historical high-performing job descriptions
- **Features:**
  - Job title → responsibilities mapping
  - Skill extraction and suggestions
  - Salary benchmarking (market data)
  - Readability scoring (Flesch-Kincaid)
  - Keyword optimization for SEO

### Candidate Matching AI
- **Algorithm:** Skills-based matching
- **Scoring:** Weighted score (skills 40%, experience 30%, location 20%, other 10%)
- **Ranking:** Sort applicants by match score
- **Improvement:** Learn from employer actions (who they shortlist/reject)

---

## Calendar Integration

### Google Calendar API
- OAuth authentication
- Create calendar events
- Send invites to attendees
- Update/delete events
- Sync two-way

### Microsoft Outlook Calendar
- Microsoft Graph API
- Similar functionality as Google Calendar

### ICS File Generation
- Fallback for other calendar systems
- Standard .ics format
- Attach to interview invite emails

---

## Payment Integration (Cross-reference EPIC-07)
- Razorpay for job posting payments
- Instant payment confirmation
- Auto-invoice generation
- Transaction tracking

---

## UI/UX Requirements

### Job Posting Form
- Multi-step wizard (5-6 steps)
- Progress indicator
- Auto-save drafts
- Rich text editor with toolbar
- Tag input for skills
- Preview mode
- Responsive design

### Applicant Management Dashboard
- Kanban board view (Applied/Shortlisted/Interview/Rejected)
- List view with filters
- Candidate cards with key info
- Quick actions on hover
- Bulk select checkboxes
- Responsive layout

### Job Analytics Dashboard
- Charts and graphs (Chart.js or similar)
- Date range selector
- Export buttons
- Responsive design
- Print-friendly

---

## Testing Requirements

### Unit Tests
- Job creation validation
- AI JD parsing accuracy
- Candidate scoring algorithm
- Payment processing

### Integration Tests
- Complete job posting flow (form → payment → live)
- Applicant management workflow
- Interview scheduling with calendar
- Team collaboration features

### E2E Tests
- Employer registration → company profile → job post → applicants → shortlist → interview

---

## Success Metrics

- Job posting completion rate > 85%
- AI JD assistance usage > 50%
- Average time to post job < 10 minutes
- Employer satisfaction score > 4.5/5
- Interview scheduling adoption > 60%
- Team collaboration feature usage > 40%

---

## Acceptance Criteria (Epic Level)

- [ ] Employers can create company profiles
- [ ] Company verification workflow functional
- [ ] Job posting form complete with all fields
- [ ] AI JD assistance working accurately
- [ ] Screening questions can be added
- [ ] Payment integration for job posting working
- [ ] Job listing management dashboard functional
- [ ] Applicants can be viewed, filtered, sorted
- [ ] Shortlist/reject workflow working
- [ ] Interview scheduling with calendar integration functional
- [ ] Team collaboration features working
- [ ] Notes, tags, and ratings functional
- [ ] Bulk resume download working
- [ ] Messaging with candidates working
- [ ] Job analytics dashboard complete
- [ ] All APIs tested and documented
- [ ] UI responsive and user-friendly

---

## Timeline Estimate
**Duration:** 8-10 weeks

### Week 1-2: Company Profile & Job Posting
- Database schema
- Company profile creation
- Basic job posting form
- Payment integration

### Week 3-4: AI JD Assistance
- AI integration for JD suggestions
- Document parsing
- Quality scoring
- Screening questions

### Week 5-6: Applicant Management
- Applicant listing and filtering
- Candidate profile view
- Shortlist/reject workflow
- Notes and tags

### Week 7-8: Interview & Collaboration
- Interview scheduling
- Calendar integration
- Team management
- Messaging

### Week 9: Analytics & Optimization
- Job analytics dashboard
- Bulk operations
- Performance optimization

### Week 10: Testing & Launch
- Comprehensive testing
- Bug fixes
- Documentation
- User training

---

## Related Epics
- EPIC-01: User Authentication (employer auth)
- EPIC-03: Job Search & Application (job listings)
- EPIC-07: Payment Integration (job posting payments)
- EPIC-09: AI JD Assistance (AI features)
- EPIC-11: Interview Scheduling (detailed implementation)

---

**Epic Owner:** Product Manager
**Stakeholders:** Backend Team, Frontend Team, AI/ML Team, Payment Team, UX Designer
**Priority:** Critical (Revenue-generating feature)
