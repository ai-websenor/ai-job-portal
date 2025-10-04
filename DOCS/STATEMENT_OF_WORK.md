# AI Job Portal - Consolidated Requirements Document

## Project Overview
A comprehensive dual-sided job platform for both corporate roles and blue-collar gig work (drivers, plumbers, caretakers, cooks, delivery boys, etc.), enabling employers to post jobs and job seekers to apply easily via web and mobile applications.

---

## Target User Roles & Core Features

### 1. Job Seekers / Candidates

#### Core Capabilities
- ✅ Search & apply for jobs
- ✅ Create profiles and resumes
- ✅ Manage applications, alerts, and messages
- ✅ Promote Profile
- ✅ Chat and engage with employers
- ✅ Get notified for relevant job profiles
- ✅ Search jobs based on interest, city, state

#### Detailed Features

**A. Profile & Resume Management**
- Create and edit comprehensive profile
- Add skills, job type preference, work experience, education
- Upload photo and documents (Aadhaar, certifications)
- Resume builder with templates
- Multiple resume versions
- Choose visibility status (public/private)
- Profile promotion options
- Video resume upload/recording

**B. Job Search & Discovery**
- Keyword-based search
- Advanced filters:
  - Salary range
  - Job Type (Full-time / Part-time / Gig / Contract / Remote)
  - Experience Level
  - Location (city, state)
  - Industry/Category
  - Company
- AI-powered job recommendations
- Save searches with alerts
- Recently viewed jobs
- Similar job suggestions

**C. Job Application**
- 1-click "Apply Now" for quick applications
- Custom applications with cover letter
- Screening question responses
- Track application status in "My Applications":
  - Applied
  - Viewed by Employer
  - Shortlisted
  - Interview Scheduled
  - Rejected
  - Hired

**D. Saved Jobs**
- Save jobs for later application
- Organize saved jobs
- Apply directly from saved list
- Expiry/deadline alerts

**E. Job Alerts**
- Set alerts by:
  - Job type
  - Location
  - Salary range
  - Keywords
  - Company
- Multi-channel delivery:
  - Email notifications
  - Push notifications (web & mobile)
  - SMS (if enabled)
  - WhatsApp (if enabled)
- Up to 5 customized alerts per profile
- Alert frequency settings (instant/daily/weekly)

**F. Communication & Engagement**
- In-app messaging with employers
- Real-time chat functionality
- Message history and notifications
- Interview confirmations
- Application updates

**G. Dashboard Overview**
- Personalized job feed
- Application status tracker
- Profile metrics (views, applications)
- Quick stats and analytics
- Notification center

**H. Notifications**
- Job match alerts
- Application status updates
- Interview invitations
- Messages from employers
- Profile view notifications
- Deadline reminders

---

### 2. Employers / Companies

#### Core Capabilities
- ✅ Post jobs
- ✅ Manage Applications
- ✅ Shortlist / Reject candidates
- ✅ Process interviews by status
- ✅ Manage job listings and applicants
- ✅ Access payment dashboard and job status
- ✅ Highlight jobs through paid subscriptions
- ✅ Upgrade/Downgrade packages

#### Detailed Features

**A. Company Profile**
- Upload logo, bio, location, industry, website
- Company branding (premium feature)
- Verification documents (KYC/PAN/GST)
- Verified employer badge
- Branded company landing page (premium)

**B. Job Posting**
- Create job posts with:
  - Job Title, Description
  - Salary Range (show/hide option)
  - Job Type (Full-time, Gig, Contract, Part-time)
  - Experience Level requirements
  - Location, City
  - Skills required
  - Application Deadline
  - Upload Job Image/Banner
- AI-powered JD assistance (suggestions, auto-fill, keyword optimization)
- Screening questions (MCQ/text)
- Job goes live immediately after successful payment

**C. Job Listing Manager**
- View all active, expired, or closed listings
- Edit existing jobs
- Renew jobs by paying subscription/package fee
- Highlight or feature jobs (paid upgrade)
- Clone job postings
- Job analytics (views, applications, conversion)

**D. Applicant Management**
- View all applicants per job
- Access candidate profiles:
  - Resume/CV
  - Video profile (if uploaded)
  - Contact information
  - Skills and experience
  - Screening answers
- Filter and sort candidates
- Mark candidates as:
  - Shortlisted
  - Rejected
  - Interview scheduled
  - On hold
- Add notes and ratings
- Download bulk resumes
- Bulk actions (shortlist/reject multiple)

**E. Interview Management**
- Schedule interviews with calendar integration
- Send interview invites (Google Calendar/ICS)
- Automated reminders via:
  - Email
  - SMS
  - WhatsApp
  - Push notifications
- Reminder schedule:
  - 24 hours before
  - 2 hours before
- Reschedule/cancel interviews
- Track interview status
- Collect interview feedback

**F. Team Collaboration**
- Multi-user accounts
- Role-based access control
- Task management (assign, track, complete)
- Reminders and event notifications
- Team member tagging (@mentions)
- Shared candidate notes
- Activity logs and audit trail

**G. Payments & Billing**
- Integrated Razorpay payment gateway
- Instant payment confirmation
- Transaction history with filters
- Download invoices (with GST)
- Reprint invoices anytime
- Subscription management
- Upgrade/downgrade plans
- Auto-renewal settings

**H. Dashboard**
- Overview of posted jobs
- Total applications received
- Shortlisted candidates count
- Interview schedules
- Messages and notifications
- Credits/plan balance
- Quick actions

**I. Plans & Subscriptions**
- Free basic access (limited job posts)
- Premium subscription tiers:
  - Resume database access
  - Featured job listings
  - Highlighted jobs
  - Bulk actions
  - Advanced analytics
- Multi-region pricing support
- Classified ad options

---

### 3. Admin Panel (Super Admin)

#### Core Capabilities
- ✅ Full platform management
- ✅ User and content management
- ✅ Category management
- ✅ Billing and subscription handling
- ✅ Reports and analytics
- ✅ Job feature management
- ✅ User verification
- ✅ Subscription plan management

#### Detailed Features

**A. Dashboard**
- Total users (candidates & employers)
- Active jobs statistics
- Application volume metrics
- Revenue summary (real-time)
- Transaction analytics
- Platform health/status
- Growth trends

**B. User Management**
- **Candidates**
  - View/edit/delete all job seekers
  - Search by name, email, phone
  - Filter by status, location, date
  - Block/unblock users
  - Suspend fake accounts
  - Reset passwords
  - Verify profiles
  - Activity monitoring

- **Employers**
  - View/edit/delete all companies
  - Verify companies (KYC document review)
  - Approve/reject registrations
  - Add "Verified Employer" badge
  - Suspend posting privileges
  - Manage subscriptions
  - View payment history

**C. Job Listing Management**
- View all posted jobs (active/inactive)
- Approve or reject jobs (if moderation enabled)
- Feature or highlight jobs
- Bulk operations on jobs
- Edit job details
- Delete inappropriate jobs
- Job quality control
- Duplicate detection

**D. Content Management System (CMS)**
- Manage static pages:
  - About Us
  - Terms & Conditions
  - Privacy Policy
  - Help/FAQs
  - Contact Us
- Blog management
- Banner and homepage sections
- Email templates
- SEO settings
- Announcement management

**E. Category & Subscription Management**
- Create/edit job categories and subcategories
- Manage subscription packages:
  - Define plan features
  - Set pricing (region-specific)
  - Job post limits
  - Resume access limits
  - Feature controls
- Create discount codes
- Promotional campaigns
- Plan comparison builder

**F. Payment & Transaction Management**
- View all transactions (successful/failed)
- Transaction logs with filters
- Invoice management
- Refund processing
- Dispute handling
- Payment gateway configuration
- Revenue reports (by date, city, plan)
- Settlement tracking

**G. Reports & Analytics**
- **Job Analytics**
  - Total jobs posted (by date, city, category)
  - Most viewed jobs
  - Job categories with high applications
  - Conversion rate (view → apply)
  - Time to fill metrics

- **Revenue Analytics**
  - Total ₹ collected (filter by date)
  - Revenue by plan type
  - Revenue by region
  - Monthly/quarterly/annual reports
  - Top hiring companies
  - Customer lifetime value

- **User Analytics**
  - Registration trends
  - Active users (daily/monthly)
  - User engagement metrics
  - Retention and churn
  - Geographic distribution

- **Application Analytics**
  - Application funnel
  - Success rate by category
  - Candidate journey metrics

**H. Notification Control**
- Send global push notifications
- Broadcast messages to user segments
- Set job alerts manually
- Update email templates
- SMS template management
- WhatsApp template management
- Notification analytics

**I. Platform Moderation**
- Content moderation tools
- Reported content review
- Spam detection
- User complaints handling
- Dispute resolution

---

## Additional AI-Powered & Advanced Modules

### 1. AI-Based Job Recommendation Engine

**Feature Description:**
An AI-driven system that delivers personalized job suggestions to each candidate by analyzing their profile, behavior, activity, skills, and preferences.

**Key Features:**
- Machine learning-based recommendations
- Self-learning model that improves over time
- "Jobs Recommended for You" section on dashboard
- Factors considered:
  - Candidate skills and experience
  - Search history and behavior
  - Application history
  - Location preferences
  - Salary expectations
  - Job type preferences
- Similarity scoring and ranking
- Backend admin view of AI performance logs
- A/B testing for recommendation algorithms
- Continuous model improvement

**Technical Requirements:**
- Collaborative filtering
- Content-based filtering
- Hybrid recommendation approach
- Real-time processing
- Training data from user interactions
- Model versioning and deployment

---

### 2. AI-Based Resume Parsing & Smart Data Mapping

**Feature Description:**
Automatically reads uploaded resumes (PDF/Word) and intelligently fills in candidate profile fields, reducing manual data entry.

**Key Features:**
- Resume content extraction using NLP
- Smart mapping of data to structured fields:
  - Personal information (name, email, phone)
  - Work experience (company, designation, duration, location)
  - Education (degree, institution, dates, grades)
  - Skills (technical and soft skills)
  - Certifications and licenses
  - Projects and achievements
  - Languages known
- Multi-format support (PDF, DOCX, DOC)
- Confidence scoring for extracted data
- Preview and edit parsed data before saving
- Profile editing allowed after auto-fill
- Handle various resume formats and layouts
- International resume format support

**Technical Requirements:**
- Natural Language Processing (NLP) engine
- Named Entity Recognition (NER)
- Text extraction libraries
- Third-party APIs (Sovren, RChilli, Affinda) or custom parser
- OCR for scanned resumes (optional)
- Pattern matching and rule-based extraction
- Machine learning models for accuracy

---

### 3. Chatbot for Candidate Engagement

**Feature Description:**
An automated chatbot providing 24x7 user engagement and support. Helps with onboarding, FAQs, job search assistance, and general queries.

**Key Features:**
- Welcome assistant with guided onboarding
- FAQ responses:
  - How to apply for jobs
  - Reset password assistance
  - Resume tips and profile completion
  - Application status queries
  - Job search help
  - Account management
- Natural Language Understanding (NLU)
- Predefined conversation flows
- Quick reply buttons
- Multi-lingual support (if enabled)
- Escalation to human support when needed
- Visible on web and mobile
- Chat widget interface
- Context-aware responses
- Conversation history

**Technical Requirements:**
- NLP platform integration:
  - Google Dialogflow
  - Amazon Lex
  - Microsoft Bot Framework
  - Rasa (open-source)
- Intent recognition and entity extraction
- Training data and knowledge base
- Web chat widget (JavaScript)
- Mobile app integration
- Analytics and conversation logs

**Exclusions:**
- No live human chat support
- No deep conversational AI beyond defined scope
- No voice/speech recognition

---

### 4. Video Resume Support

**Feature Description:**
Job seekers can upload or record short video introductions (video resumes) that employers can view in candidate profiles, adding a personal dimension to applications.

**Key Features:**
- Upload pre-recorded video (MP4, MOV, AVI, WebM)
- Record video directly via:
  - Web browser (WebRTC)
  - Mobile app camera
- Video specifications:
  - Duration: 1-2 minutes (recommended)
  - Max file size: 50-100MB
  - Format: MP4 (standardized)
- Video preview and playback
- Delete/replace video option
- Privacy controls (who can view)
- Secure video storage and streaming
- Thumbnail auto-generation
- Video compression and encoding
- Employers view video in applicant listing
- Video moderation option via admin panel
- Analytics (view count, watch duration)

**Technical Requirements:**
- Video upload handling
- WebRTC for browser recording
- Server-side video encoding
- Cloud storage (AWS S3, Azure Blob)
- CDN for video delivery
- Video streaming (progressive or HLS)
- Mobile camera integration
- Video compression libraries
- Admin moderation interface

**Exclusions:**
- No video editing tools
- No live video interviews
- No integration with conferencing tools (Zoom/Teams)

---

### 5. Interview Scheduling with Calendar Integration & Automated Reminders

**Feature Description:**
Recruiters can schedule interviews with calendar integration, and the system automatically sends reminders via multiple channels to reduce no-shows.

**Key Features:**
- Interview scheduling interface
- Calendar integration:
  - Google Calendar API
  - Microsoft Outlook Calendar
  - ICS-based invite links
- Send calendar invites to candidates and interviewers
- Configurable time zones
- Interview types (Phone, Video, In-person)
- Automated multi-channel reminders:
  - Email
  - SMS
  - WhatsApp
  - Push notifications (mobile app)
- Reminder schedule:
  - 24 hours before interview
  - 2 hours before interview
  - Custom reminder timing
- Interview status tracking:
  - Scheduled
  - Confirmed
  - Reminded
  - Completed
  - Rescheduled
  - Canceled
  - No-show
- Reschedule/cancel with notifications
- Two-way sync with calendars
- Interview feedback collection
- Interview history and analytics

**Technical Requirements:**
- Google Calendar API integration
- Microsoft Graph API (Outlook)
- ICS file generation
- SMS gateway (Twilio, MSG91)
- WhatsApp Business API
- Email service (SMTP, SendGrid, AWS SES)
- Cron jobs for scheduled reminders
- Webhook handling for calendar updates
- Time zone management

**Exclusions:**
- No live video conferencing integration (Zoom/Teams)
- No AI interview assistant
- No automated interview scoring

---

## Additional Enhanced Modules (from Extended SOW)

### 6. Resume Quality Score & Analysis
- Analyze resume for quality and completeness
- Generate numerical score (0-100)
- Actionable feedback and suggestions
- Section-by-section analysis
- Keyword optimization recommendations
- ATS-compatibility check
- Industry benchmarking
- Improvement workflow

### 7. Personalized Job Alerts (Multi-Channel)
- SMS alerts via gateway integration
- WhatsApp Business API alerts
- Up to 5 customized alerts
- Alert subscription management
- Smart deduplication
- Compliance with regulations (GDPR, TCPA, TRAI DND)
- Delivery analytics

### 8. Hiring Trends & Market Insights
- Trending skills dashboard
- Top-paying roles
- Salary benchmarks and calculator
- Recommended online courses
- Job market trends
- Industry insights
- Data from internal platform + external APIs
- Interactive charts and visualizations

### 9. Advanced Job Description (JD) Assistance
- AI-powered JD suggestions
- Auto-fill based on job title
- Upload JD document for parsing
- Skill and keyword recommendations
- NLP-based content enhancement
- Relevance scoring
- Grammar and readability checks
- Competitive insights

### 10. Mobile Applications (iOS & Android)
- Native or cross-platform (React Native/Flutter)
- Full feature parity with web
- Push notifications
- Offline mode (optional)
- Biometric authentication
- Camera integration for video profiles
- Geolocation for job search
- Deep linking
- App Store and Play Store distribution

### 11. Employer Branding Portal
- Branded company landing pages
- Custom company URL
- Rich media (photos, videos, gallery)
- Company culture showcase
- Banner and logo placements
- Sponsored listings
- Premium branding features
- Analytics for company page

### 12. Collaborative Hiring Tools
- Multi-user employer accounts
- Role-based permissions
- Task management system
- Team reminders
- Event-based notifications
- User tagging (@mentions)
- Comment threads
- Shared notes and ratings
- Activity logs and audit trail
- Workflow automation

### 13. Multi-Region Posting & Plans
- Region-specific subscription plans
- Localized pricing and currency
- Tax calculations (GST, VAT, Sales Tax)
- Regional compliance
- Multi-region job visibility
- Classified ad tiers by region

---

## Payment Integration

### Razorpay Integration
- **Payment Gateway:** Razorpay (primary for India)
- **Alternative:** Stripe (for international markets)

**Payment Flow:**
1. Employer selects job posting plan
2. Redirects to Razorpay checkout
3. Multiple payment methods:
   - Credit/Debit cards (Visa, Mastercard, Amex, Rupay)
   - Net Banking (all major banks)
   - UPI (Google Pay, PhonePe, Paytm, etc.)
   - Wallets (Paytm, Mobikwik, etc.)
   - EMI (if applicable)
4. Instant confirmation screen after success
5. Automated invoice generation (GST-compliant)
6. Email invoice delivery
7. Job goes live immediately

**Features:**
- Secure PCI-DSS compliant processing
- Transaction history
- Failed transaction retry
- Refund processing
- Webhook integration
- Subscription auto-renewal
- Payment analytics for admin

---

## Reports & Analytics

### Key Reports
1. **Job Reports**
   - Total jobs posted (by date, city, category)
   - Most viewed jobs
   - Job categories with high applications
   - Conversion rate (view → apply)

2. **Revenue Reports**
   - Total ₹ collected (filter by date)
   - Revenue by plan type
   - Revenue by region
   - Top hiring companies
   - Payment method distribution

3. **User Reports**
   - Total registrations (candidates & employers)
   - Active users (DAU/MAU)
   - User growth trends
   - Geographic distribution
   - Engagement metrics

4. **Application Reports**
   - Total applications
   - Application funnel
   - Time to hire
   - Success rate by category

5. **Platform Analytics**
   - Traffic sources
   - Search queries
   - Popular job categories
   - Candidate behavior
   - Employer activity

---

## Technical Requirements

### Platform
- Web-based application (responsive)
- Mobile applications (iOS & Android)
- Real-time notifications
- Secure authentication (OAuth, JWT)
- Cloud-based architecture

### Security
- SSL/TLS encryption
- Data encryption (at rest and in transit)
- PCI-DSS compliance (payments)
- GDPR/CCPA compliance (data privacy)
- Role-based access control (RBAC)
- Two-factor authentication (2FA)
- Session management
- Security audit logs

### Performance
- Fast page load times (<3 seconds)
- Optimized database queries
- Caching mechanisms (Redis, Memcached)
- CDN for static assets
- Image optimization
- API rate limiting
- Scalable architecture (horizontal scaling)
- Load balancing

### Integrations
- Social login (Google, LinkedIn)
- Payment gateways (Razorpay, Stripe)
- SMS gateway (Twilio, MSG91)
- WhatsApp Business API
- Email service (SendGrid, AWS SES)
- Calendar APIs (Google, Outlook)
- Video storage (AWS S3, Azure Blob)
- Analytics (Google Analytics, Mixpanel)
- NLP services (Dialogflow, AWS Comprehend)
- Resume parsing APIs (optional)

---

## Exclusions (Out of Scope)

### Features Not Included
1. **Live Communication**
   - No live human chat support
   - No live video interview platform
   - No integration with Zoom/Teams/Meet

2. **Advanced AI**
   - No deep learning beyond defined scope
   - No behavioral AI predictions
   - No extensive custom ML model training from scratch

3. **Third-Party Service Costs**
   - Monthly/usage costs of APIs (Dialogflow, Twilio, WhatsApp, SMS)
   - Video hosting and CDN costs
   - Cloud storage fees
   - Payment gateway transaction fees
   - External data subscriptions

4. **Non-Requested Features**
   - Background verification services
   - Payroll integration
   - HRIS/ATS integrations
   - Skill assessment platforms
   - Visa/relocation services

5. **Marketing & Content**
   - SEO services and marketing campaigns
   - Social media marketing
   - Content creation (blogs, articles)
   - Email marketing campaigns

---

## Assumptions

1. **Client Responsibilities**
   - Provide third-party API accounts and credentials (SMS, WhatsApp, etc.)
   - Timely feedback and approvals
   - Access to staging/production environments
   - Content for static pages
   - Testing and UAT

2. **Data Availability**
   - Historical data for AI training (if available)
   - Internal platform data for insights module

3. **Compliance**
   - Client ensures legal compliance with regional laws
   - Privacy policy and T&C updates

4. **Technology**
   - Vendor has flexibility in technology stack selection
   - Existing platform architecture is compatible

5. **Third-Party Services**
   - APIs and services are available and functional
   - Documentation and support are adequate

---

## Success Criteria

### Functional Success
- All features work as specified
- No critical bugs in production
- Performance meets standards
- All integrations functional

### User Experience
- Intuitive and easy to use
- Mobile-responsive
- Fast and reliable
- Accessible

### Business Impact
- Increased user registrations
- Higher job posting conversions
- Improved engagement metrics
- Better candidate-employer matching
- Revenue growth

### Technical Success
- Scalable architecture
- Secure and compliant
- Well-documented
- Maintainable codebase

---

## Project Deliverables

### Documentation
- User manuals (Candidate, Employer, Admin)
- API documentation
- Technical documentation
- Deployment guide
- Training materials

### Code & Assets
- Source code (version controlled)
- Database schemas
- API endpoints
- UI/UX designs
- Assets (images, icons, templates)

### Testing
- Test cases and results
- UAT sign-off
- Performance test reports
- Security audit reports

### Deployment
- Staging environment setup
- Production deployment
- Go-live support
- Post-deployment monitoring

---

## Next Steps

1. **Review & Approval**
   - Stakeholder review of requirements
   - Clarifications and refinements
   - Final approval

2. **Project Planning**
   - Detailed project plan with timeline
   - Resource allocation
   - Milestones and sprints
   - Communication plan

3. **Design Phase**
   - Wireframes and mockups
   - UI/UX design
   - Database design
   - Architecture design

4. **Development**
   - Agile/Scrum methodology
   - Sprint-based delivery
   - Regular demos
   - Code reviews

5. **Testing**
   - Unit testing
   - Integration testing
   - UAT
   - Performance testing
   - Security testing

6. **Deployment & Launch**
   - Staging deployment
   - Production deployment
   - Training
   - Go-live
   - Post-launch support

---

**End of Consolidated Requirements Document**

---

*This document consolidates all requirements from multiple sources and serves as the single source of truth for the AI Job Portal project. All features, modules, and specifications are cross-referenced and validated for completeness.*
