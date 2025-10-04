# EPIC-03: Job Search & Application System

## Epic Overview
Build a comprehensive job search and application system with advanced filtering, AI-powered recommendations, saved searches, job alerts, and streamlined application processes for job seekers.

---

## Business Value
- Enable efficient job discovery for candidates
- Increase application conversion rates
- Provide personalized job recommendations
- Reduce time-to-apply with quick application features
- Track application journey from start to finish

---

## User Stories

### US-03.1: Basic Job Search
**As a** job seeker
**I want to** search for jobs using keywords
**So that** I can find relevant opportunities

**Acceptance Criteria:**
- Search bar prominently displayed on homepage and dashboard
- Keyword-based search supporting:
  - Job titles (e.g., "Software Engineer", "Delivery Driver")
  - Skills (e.g., "Python", "Driving License")
  - Company names (e.g., "Google", "Amazon")
  - Location (e.g., "Mumbai", "Remote")
- Auto-suggest/autocomplete as user types
- Search history saved (last 10 searches)
- Clear search button
- Voice search support (mobile app)
- Search results displayed as job cards
- No results page with suggestions
- Search analytics tracked (popular searches)

---

### US-03.2: Advanced Filters
**As a** job seeker
**I want to** filter jobs by multiple criteria
**So that** I can narrow down to the most relevant opportunities

**Acceptance Criteria:**
- Filter panel with multiple options:

  **Location Filters:**
  - City/State selection (multi-select)
  - Remote jobs only checkbox
  - Within X km radius (if geolocation enabled)

  **Salary Filters:**
  - Minimum salary (slider or input)
  - Maximum salary (slider or input)
  - Only show jobs with disclosed salary

  **Job Type Filters:**
  - Full-time
  - Part-time
  - Gig/Freelance
  - Contract
  - Internship
  - Remote

  **Experience Filters:**
  - Fresher/Entry level (0-1 years)
  - 1-3 years
  - 3-5 years
  - 5-10 years
  - 10+ years

  **Other Filters:**
  - Industry/Sector (multi-select)
  - Company size
  - Posted date (Last 24 hours/Week/Month)
  - Application deadline (Next 7 days/Next 30 days)

- Filter count badge (e.g., "3 filters applied")
- Clear all filters button
- Active filters displayed as removable tags
- Filter results update in real-time
- Persist filters in URL (shareable filtered search)
- Mobile-friendly filter drawer

---

### US-03.3: Sort Job Results
**As a** job seeker
**I want to** sort search results by different criteria
**So that** I can prioritize jobs based on my preference

**Acceptance Criteria:**
- Sort dropdown with options:
  - **Relevance** (default - AI-based matching)
  - **Latest** (most recently posted first)
  - **Salary: High to Low**
  - **Salary: Low to High**
  - **Application Deadline** (ending soon first)
  - **Company Rating** (if available)
- Sort preference saved for session
- Results re-order immediately on selection
- Sort indicator on job cards (e.g., "Posted 2 hours ago")

---

### US-03.4: Job Details View
**As a** job seeker
**I want to** view complete job details
**So that** I can decide if I should apply

**Acceptance Criteria:**
- Clicking job card opens detailed view
- Job details page includes:

  **Job Information:**
  - Job title
  - Company name and logo
  - Location
  - Salary range (if disclosed)
  - Job type and work mode
  - Experience required
  - Posted date
  - Application deadline
  - Number of openings
  - Number of applicants (optional)

  **Description Sections:**
  - Job overview
  - Key responsibilities
  - Required skills and qualifications
  - Preferred qualifications
  - Benefits and perks

  **Company Information:**
  - About the company
  - Company size and industry
  - Company website link
  - Social media links
  - Other active jobs from company

- Breadcrumb navigation (Search > Category > Job Title)
- Share job buttons (WhatsApp, Email, LinkedIn, Twitter, Copy link)
- Report job (spam/inappropriate)
- Save job button (heart icon)
- Apply button (prominent CTA)
- Similar jobs section at bottom
- SEO-optimized job page (meta tags, structured data)

---

### US-03.5: Quick Apply (1-Click Application)
**As a** job seeker
**I want to** apply quickly using my saved profile
**So that** I can apply to multiple jobs efficiently

**Acceptance Criteria:**
- "Quick Apply" or "Apply Now" button on job details
- Clicking button shows confirmation modal:
  - "Apply with: [Default Resume Name]"
  - Profile summary preview
  - Option to add quick note (optional, 200 chars)
  - Checkbox: "I confirm the information is accurate"
- Submit application with one click
- Application submitted instantly
- Success confirmation message
- Email confirmation sent
- Application appears in "My Applications"
- Can only quick apply once per job
- Button changes to "Applied" after submission
- Default resume used (set in profile)

---

### US-03.6: Custom Application
**As a** job seeker
**I want to** submit a customized application
**So that** I can tailor my application to specific jobs

**Acceptance Criteria:**
- "Apply with Custom Details" option
- Custom application form includes:
  - Select resume version (dropdown)
  - Upload/select cover letter (optional)
  - Answer screening questions (if employer added):
    - Multiple choice questions
    - Text-based questions
    - Yes/No questions
  - Upload additional documents (portfolio, certificates)
  - Availability for interview (date range)
  - Notice period confirmation
- Form validation for required fields
- Save as draft (complete later)
- Preview application before submit
- Submit button with confirmation
- Application success page
- Email and push notification
- Application tracked in "My Applications"

---

### US-03.7: Save Jobs
**As a** job seeker
**I want to** save jobs to apply later
**So that** I don't lose interesting opportunities

**Acceptance Criteria:**
- Save/bookmark icon on job cards and job details page
- Click to save (heart icon fills in)
- Click again to unsave
- Toast notification: "Job saved"
- Saved jobs accessible from dashboard ("My Saved Jobs")
- Saved jobs list shows:
  - Job title, company, location
  - Saved date
  - Days until deadline
  - Quick apply button
  - Remove from saved
- Filter saved jobs (by date saved, deadline)
- Bulk actions (apply to multiple, remove multiple)
- Expiry alerts (job closing soon)
- Notification if saved job is removed by employer
- Max 50 saved jobs at a time

---

### US-03.8: Save Search & Job Alerts
**As a** job seeker
**I want to** save my search criteria and get alerts
**So that** I'm notified when new matching jobs are posted

**Acceptance Criteria:**
- "Save this search" button after performing search
- Save search modal:
  - Name your search (e.g., "Remote Python Jobs in Mumbai")
  - Alert frequency: Instant / Daily / Weekly
  - Notification channels: Email / Push / SMS / WhatsApp
- Max 5 saved searches
- Manage saved searches from dashboard
- Edit search criteria
- Change alert frequency
- Activate/deactivate alerts
- Delete saved search
- When new job matches, send alert via selected channels
- Alert contains:
  - Number of new jobs
  - Top 3-5 job titles
  - Link to view all matching jobs
- Unsubscribe option in alerts
- Alert performance tracking (open rate, click rate)

---

### US-03.9: My Applications Dashboard
**As a** job seeker
**I want to** track all my job applications
**So that** I know the status of each application

**Acceptance Criteria:**
- "My Applications" section in candidate dashboard
- List all applications with:
  - Job title and company
  - Application date
  - Current status (badge/label):
    - Applied
    - Viewed by Employer
    - Shortlisted
    - Interview Scheduled
    - Rejected
    - Offer Received
    - Hired
  - Action buttons (view details, withdraw, message employer)
- Filter applications by status
- Search applications (job title, company)
- Sort by date (newest/oldest)
- Application count by status (sidebar stats)
- Timeline view for each application (visual journey)
- Status change notifications (email + push)
- Application details page:
  - Job information
  - Resume/docs submitted
  - Screening answers
  - Timeline of status changes
  - Employer messages
- Withdraw application button (with confirmation)
- Reapplication if withdrawn (if allowed by employer)

---

### US-03.10: AI-Powered Job Recommendations
**As a** job seeker
**I want to** see personalized job recommendations
**So that** I discover relevant opportunities I might have missed

**Acceptance Criteria:**
- "Recommended for You" section on dashboard
- AI algorithm considers:
  - User's skills and experience
  - Job preferences (location, type, salary)
  - Profile completeness
  - Search history
  - Application history
  - Similar users' behavior (collaborative filtering)
- Show top 10-20 recommended jobs
- Each job card shows match percentage (e.g., "85% match")
- Match score breakdown (hover/click):
  - Skills match: 90%
  - Location match: 80%
  - Experience match: 85%
- Refresh recommendations daily
- "Not interested" button (hides job, improves future recs)
- "Why this job?" explanation (transparency)
- Apply directly from recommendations
- Track recommendation performance (click rate, apply rate)

---

### US-03.11: Similar Jobs
**As a** job seeker
**I want to** see jobs similar to the one I'm viewing
**So that** I can explore more relevant opportunities

**Acceptance Criteria:**
- "Similar Jobs" section on job details page
- Algorithm based on:
  - Same job title/category
  - Similar skills required
  - Same company (other openings)
  - Same location
  - Similar salary range
- Show 5-10 similar jobs
- Job cards with key info (title, company, location, salary)
- Quick apply option
- Save job option
- Click to view full details
- Refresh similar jobs if user applies/saves

---

### US-03.12: Job Expiry & Deadline Alerts
**As a** job seeker
**I want to** be reminded of application deadlines
**So that** I don't miss opportunities

**Acceptance Criteria:**
- Alert for saved jobs with upcoming deadlines:
  - 7 days before deadline
  - 3 days before deadline
  - 1 day before deadline
  - On deadline day
- Alert channels: Email + Push notification
- Alert message: "Reminder: [Job Title] application closes in X days"
- Direct link to apply
- Snooze option (remind tomorrow)
- Dismiss alert (don't remind again)
- Notification center shows all upcoming deadlines
- Calendar view of deadlines (optional)

---

### US-03.13: Application Withdrawal
**As a** job seeker
**I want to** withdraw my application if I'm no longer interested
**So that** I keep my application list clean

**Acceptance Criteria:**
- "Withdraw Application" button in application details
- Confirmation modal:
  - "Are you sure you want to withdraw?"
  - Optional reason dropdown (Found another job / Not interested / etc.)
  - Checkbox: "I understand this action cannot be undone"
- After withdrawal:
  - Status changed to "Withdrawn"
  - Employer notified (optional)
  - Application removed from active list (moved to history)
  - Cannot reapply for same job (employer setting)
- Withdrawn applications visible in "Application History"
- Analytics on withdrawal reasons (for platform insights)

---

### US-03.14: Employer Messaging from Application
**As a** job seeker
**I want to** message the employer about my application
**So that** I can ask questions or follow up

**Acceptance Criteria:**
- "Message Employer" button on application details page
- Opens messaging interface:
  - Pre-filled subject: "Re: [Job Title] Application"
  - Message text area (max 1000 chars)
  - Attach files option (optional)
- Send message button
- Message delivered to employer's inbox
- Employer can reply
- Thread-based conversation
- Notifications for new messages (email + push)
- Message history visible in application
- Read receipts (optional)
- Response time indicator (employer avg response time)

---

### US-03.15: Job Sharing
**As a** job seeker
**I want to** share job postings with friends
**So that** I can help others find opportunities

**Acceptance Criteria:**
- Share buttons on job details page:
  - WhatsApp
  - Email
  - LinkedIn
  - Twitter
  - Facebook
  - Copy link
- WhatsApp: Opens WhatsApp with pre-filled message and job link
- Email: Opens email client with subject and job details
- Social media: Share post with job title, company, link
- Copy link: Copies job URL to clipboard, shows toast "Link copied"
- Shareable link works even for logged-out users
- Track share analytics (shares per channel)
- Referral tracking (if user applies via shared link)

---

### US-03.16: Job Search Suggestions (No Results)
**As a** job seeker
**I want to** get helpful suggestions when no jobs match my search
**So that** I can modify my search or explore alternatives

**Acceptance Criteria:**
- No results page displays:
  - Message: "No jobs found for '[search query]'"
  - Suggestions:
    - Try broader search terms
    - Remove some filters
    - Search in nearby cities
    - Similar job titles (AI-generated)
  - Show trending/popular jobs instead
  - "Clear all filters" button
  - "Save this search" option (get alerts when jobs match)
- Analytics on no-result searches (improve job coverage)

---

## Technical Requirements

### Database Schema

**Jobs Table:**
```sql
jobs (
  id: UUID PRIMARY KEY,
  employer_id: UUID FOREIGN KEY REFERENCES users(id),
  title: VARCHAR(255),
  description: TEXT,
  requirements: TEXT,
  benefits: TEXT,
  category_id: UUID FOREIGN KEY REFERENCES categories(id),
  job_type: ENUM('full_time', 'part_time', 'contract', 'freelance', 'internship', 'gig'),
  work_mode: ENUM('office', 'remote', 'hybrid'),
  location: VARCHAR(255),
  city: VARCHAR(100),
  state: VARCHAR(100),
  country: VARCHAR(100),
  salary_min: DECIMAL(10,2),
  salary_max: DECIMAL(10,2),
  salary_currency: VARCHAR(10),
  salary_disclosed: BOOLEAN DEFAULT false,
  experience_min: DECIMAL(3,1),
  experience_max: DECIMAL(3,1),
  skills_required: JSONB,
  qualifications: JSONB,
  number_of_openings: INTEGER DEFAULT 1,
  application_deadline: DATE,
  status: ENUM('draft', 'active', 'closed', 'expired'),
  is_featured: BOOLEAN DEFAULT false,
  is_highlighted: BOOLEAN DEFAULT false,
  is_urgent: BOOLEAN DEFAULT false,
  views_count: INTEGER DEFAULT 0,
  applications_count: INTEGER DEFAULT 0,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  published_at: TIMESTAMP,
  closed_at: TIMESTAMP
)
```

**Applications Table:**
```sql
applications (
  id: UUID PRIMARY KEY,
  job_id: UUID FOREIGN KEY REFERENCES jobs(id),
  candidate_id: UUID FOREIGN KEY REFERENCES users(id),
  resume_id: UUID FOREIGN KEY REFERENCES resumes(id),
  cover_letter: TEXT,
  screening_answers: JSONB,
  additional_documents: JSONB,
  status: ENUM('applied', 'viewed', 'shortlisted', 'interview_scheduled', 'rejected', 'offered', 'hired', 'withdrawn'),
  applied_at: TIMESTAMP,
  viewed_at: TIMESTAMP,
  shortlisted_at: TIMESTAMP,
  rejected_at: TIMESTAMP,
  rejection_reason: VARCHAR(500),
  notes: TEXT,
  rating: INTEGER,
  is_withdrawn: BOOLEAN DEFAULT false,
  withdrawn_at: TIMESTAMP,
  withdrawal_reason: VARCHAR(500),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Saved Jobs Table:**
```sql
saved_jobs (
  id: UUID PRIMARY KEY,
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  job_id: UUID FOREIGN KEY REFERENCES jobs(id),
  saved_at: TIMESTAMP,
  notes: TEXT,
  UNIQUE(user_id, job_id)
)
```

**Saved Searches Table:**
```sql
saved_searches (
  id: UUID PRIMARY KEY,
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  name: VARCHAR(255),
  search_criteria: JSONB,
  alert_enabled: BOOLEAN DEFAULT true,
  alert_frequency: ENUM('instant', 'daily', 'weekly'),
  alert_channels: JSONB,
  last_alert_sent: TIMESTAMP,
  is_active: BOOLEAN DEFAULT true,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Job Views Table:**
```sql
job_views (
  id: UUID PRIMARY KEY,
  job_id: UUID FOREIGN KEY REFERENCES jobs(id),
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  viewed_at: TIMESTAMP,
  ip_address: VARCHAR(45),
  user_agent: TEXT
)
```

**Job Shares Table:**
```sql
job_shares (
  id: UUID PRIMARY KEY,
  job_id: UUID FOREIGN KEY REFERENCES jobs(id),
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  share_channel: ENUM('whatsapp', 'email', 'linkedin', 'twitter', 'facebook', 'copy_link'),
  shared_at: TIMESTAMP
)
```

---

## API Endpoints

```
# Job Search
GET    /api/v1/jobs                       - Search jobs (with filters)
GET    /api/v1/jobs/:id                   - Get job details
GET    /api/v1/jobs/:id/similar           - Get similar jobs
GET    /api/v1/jobs/recommendations       - Get AI recommendations
GET    /api/v1/jobs/trending              - Get trending jobs
POST   /api/v1/jobs/:id/view              - Track job view

# Applications
POST   /api/v1/applications               - Submit application
GET    /api/v1/applications               - Get user's applications
GET    /api/v1/applications/:id           - Get application details
PUT    /api/v1/applications/:id/withdraw  - Withdraw application
GET    /api/v1/applications/stats         - Get application statistics

# Saved Jobs
GET    /api/v1/saved-jobs                 - List saved jobs
POST   /api/v1/saved-jobs                 - Save a job
DELETE /api/v1/saved-jobs/:jobId         - Unsave a job

# Saved Searches & Alerts
GET    /api/v1/saved-searches             - List saved searches
POST   /api/v1/saved-searches             - Create saved search
PUT    /api/v1/saved-searches/:id         - Update saved search
DELETE /api/v1/saved-searches/:id         - Delete saved search
PUT    /api/v1/saved-searches/:id/toggle  - Enable/disable alerts

# Job Sharing
POST   /api/v1/jobs/:id/share             - Track job share

# Search Suggestions
GET    /api/v1/search/autocomplete        - Autocomplete suggestions
GET    /api/v1/search/history             - Get search history
DELETE /api/v1/search/history             - Clear search history
```

---

## Search & Recommendation Algorithms

### Search Algorithm
1. **Full-Text Search:**
   - Elasticsearch or PostgreSQL Full-Text Search
   - Index job titles, descriptions, skills, company names
   - Weighted scoring (title > skills > description)

2. **Relevance Ranking:**
   - Keyword match score
   - Recency (newer jobs ranked higher)
   - User's profile match (skills, experience, location)
   - Employer credibility (verified, ratings)

3. **Filter Application:**
   - Apply filters as query constraints
   - Combine with AND logic (all filters must match)

4. **Pagination:**
   - 20-30 jobs per page
   - Infinite scroll or pagination controls

### AI Recommendation Algorithm
1. **Content-Based Filtering:**
   - Match user skills with job requirements
   - Match user experience with job requirements
   - Match location preferences

2. **Collaborative Filtering:**
   - Find similar users (skills, experience, applications)
   - Recommend jobs those similar users applied to

3. **Hybrid Approach:**
   - Combine content-based and collaborative filtering
   - Weighted scoring (70% content, 30% collaborative)

4. **Machine Learning Model:**
   - Train on historical application data
   - Features: user profile, job attributes, application success
   - Predict likelihood of application/interest
   - Rank by predicted probability

---

## Job Alert System

### Alert Trigger
- Cron job runs every hour (for instant alerts) or daily (for daily digest)
- Query new jobs matching each saved search
- Deduplicate (don't send same job twice)
- Send via selected channels (email, SMS, WhatsApp, push)

### Alert Content
- Subject: "[X] new jobs matching '[Search Name]'"
- Body:
  - Number of new jobs
  - List of jobs (title, company, location, salary)
  - "View All" link
  - Unsubscribe link
- Responsive email template
- Track open rate, click rate

---

## UI/UX Requirements

### Job Search Page
- Prominent search bar at top
- Filter sidebar (collapsible on mobile)
- Job cards grid (2-3 columns on desktop, 1 on mobile)
- Sorting dropdown
- Active filters as removable tags
- Loading skeleton while fetching
- Infinite scroll or pagination
- "Back to top" button

### Job Card Design
- Company logo
- Job title (bold, large)
- Company name
- Location
- Salary (if disclosed)
- Key skills (tags)
- Posted date
- Save icon (heart)
- "Quick Apply" button
- Hover effects

### Job Details Page
- Breadcrumb navigation
- Job header (title, company, location, salary)
- Apply button (sticky on scroll)
- Share buttons
- Tabbed sections (Description, Company, Similar Jobs)
- Responsive layout
- Print-friendly

### My Applications Page
- Status filter tabs
- Application cards with timeline
- Search and sort
- Action buttons
- Empty state (no applications)

---

## Testing Requirements

### Unit Tests
- Search query building
- Filter application logic
- Recommendation algorithm
- Application submission validation

### Integration Tests
- Complete search flow
- Application submission flow
- Saved search and alerts
- Job recommendations

### Performance Tests
- Search response time (<500ms)
- Handle 1000+ concurrent searches
- Job details page load (<1 second)
- Recommendation generation (<2 seconds)

---

## Success Metrics

- Job search to application conversion > 10%
- Average applications per user > 5
- Saved search adoption > 30%
- Quick apply usage > 60% of applications
- Recommendation click-through rate > 20%
- Job view to apply rate > 8%

---

## Acceptance Criteria (Epic Level)

- [ ] Job search with filters and sorting working
- [ ] Job details page functional
- [ ] Quick apply (1-click) working
- [ ] Custom application with screening questions working
- [ ] Saved jobs feature functional
- [ ] Save search and alerts working
- [ ] My Applications dashboard complete
- [ ] AI recommendations generating accurately
- [ ] Similar jobs displayed correctly
- [ ] Application withdrawal working
- [ ] Messaging with employer functional
- [ ] Job sharing on all channels working
- [ ] All APIs tested and documented
- [ ] UI responsive and polished
- [ ] Performance benchmarks met

---

## Timeline Estimate
**Duration:** 6-7 weeks

### Week 1-2: Job Search & Filters
- Database schema
- Search API with Elasticsearch
- Filters and sorting
- Job listing UI

### Week 3: Job Details & Application
- Job details page
- Quick apply
- Custom application form
- Application submission

### Week 4: Saved Jobs & Searches
- Save jobs feature
- Saved search and alerts
- Alert system implementation

### Week 5: My Applications
- Applications dashboard
- Application tracking
- Status updates
- Messaging

### Week 6: AI Recommendations
- Recommendation algorithm
- Similar jobs
- ML model training (if applicable)

### Week 7: Testing & Polish
- Comprehensive testing
- Performance optimization
- UI/UX refinement
- Bug fixes

---

## Related Epics
- EPIC-02: Job Seeker Profile (uses profile data for matching)
- EPIC-04: Employer Job Posting (creates jobs to search)
- EPIC-08: AI Job Recommendation Engine (recommendation algorithm)
- EPIC-10: Notifications (job alerts, application updates)

---

**Epic Owner:** Product Manager
**Stakeholders:** Backend Team, Frontend Team, Data Science Team, UX Designer
**Priority:** Critical (Core platform feature)
