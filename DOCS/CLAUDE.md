# AI Job Portal - Understanding the Project

## Project Overview

The **AI Job Portal** is a comprehensive dual-sided job platform designed to connect employers with job seekers across both corporate roles and blue-collar gig work (drivers, plumbers, caretakers, cooks, delivery personnel, etc.). The platform offers web and mobile applications with AI-powered features to enhance job matching, application processes, and recruitment workflows.

---

## Quick Start Guide

### What This Project Does

This platform serves three primary user groups:

1. **Job Seekers / Candidates** - Search and apply for jobs, create profiles, manage applications
2. **Employers / Companies** - Post jobs, manage applicants, schedule interviews, collaborate with teams
3. **Platform Administrators** - Manage users, moderate content, handle subscriptions, generate analytics

### Key Differentiators

- **Dual Market Focus**: Serves both corporate and blue-collar job markets
- **AI-Powered**: Job recommendations, resume parsing, JD assistance
- **Multi-Channel Engagement**: Email, SMS, WhatsApp, Push notifications
- **Video Resumes**: Candidates can record/upload video introductions
- **Comprehensive ATS**: Full applicant tracking system for employers
- **Payment Integration**: Razorpay/Stripe for job posting subscriptions

---

## Project Structure

### Documentation Hierarchy

```
DOCS/
├── STATEMENT_OF_WORK.md          # Complete requirements document (SOW)
├── CLAUDE.md                       # This file - project overview
├── ai-tools.md                     # AI/ML microservices architecture & models
├── job-questions-usage.md          # Screening questions implementation guide
├── technical/                      # Technical reference documentation
│   ├── README.md                   # Technical docs index
│   ├── DATABASE.md                 # Database schema & ER diagrams
│   ├── ARCHITECTURE.md             # Microservices architecture diagrams
│   └── API-REFERENCE.md            # REST/gRPC API endpoints
└── epics/
    ├── README.md                   # Epic index and roadmap
    ├── EPIC-01-USER-AUTHENTICATION.md
    ├── EPIC-02-JOB-SEEKER-PROFILE.md
    ├── EPIC-03-JOB-SEARCH-APPLICATION.md
    ├── EPIC-04-EMPLOYER-JOB-POSTING.md
    ├── EPIC-05-ADMIN-PANEL.md
    ├── EPIC-06-NOTIFICATIONS-ALERTS.md
    ├── EPIC-07-PAYMENT-SUBSCRIPTION.md
    ├── EPIC-08-AI-JOB-RECOMMENDATIONS.md
    ├── EPIC-09-AI-RESUME-PARSING.md
    ├── EPIC-10-VIDEO-RESUME.md
    ├── EPIC-11-INTERVIEW-SCHEDULING.md
    ├── EPIC-12-MESSAGING-COMMUNICATION.md
    ├── EPIC-13-MOBILE-APPLICATIONS.md
    ├── EPIC-14-CHATBOT-ENGAGEMENT.md
    ├── EPIC-15-ANALYTICS-REPORTING.md
    ├── EPIC-16-EMPLOYER-BRANDING.md
    ├── EPIC-17-MULTI-REGION-SUPPORT.md
    └── EPIC-18-TEAM-COLLABORATION.md
```

### How to Navigate the Documentation

1. **Start Here (CLAUDE.md)** - High-level overview and navigation guide
2. **STATEMENT_OF_WORK.md** - Detailed feature requirements, technical specs, and business rules
3. **ai-tools.md** - AI/ML microservices, models, and integration guide
4. **technical/** - Technical reference docs:
   - **DATABASE.md** - ER diagrams, 50+ table schemas, relationships
   - **ARCHITECTURE.md** - Microservice topology, communication patterns, deployment
   - **API-REFERENCE.md** - REST/gRPC endpoints with request/response examples
5. **epics/README.md** - Epic index showing development phases and dependencies
6. **Individual Epic Files** - Detailed user stories, technical requirements, and acceptance criteria

---

## Core Features by User Role

### 1. Job Seekers

| Feature Area | Key Capabilities |
|--------------|------------------|
| **Profile Management** | Create profiles, resume builder, skills tracking, document uploads, video resumes |
| **Job Search** | Advanced filters, AI recommendations, saved searches, job alerts |
| **Applications** | 1-click apply, custom applications, screening questions, status tracking |
| **Communication** | In-app messaging with employers, interview confirmations, notifications |
| **Engagement** | Chatbot assistance, job alerts (Email/SMS/WhatsApp), profile analytics |

### 2. Employers

| Feature Area | Key Capabilities |
|--------------|------------------|
| **Company Profile** | Branding, verification (KYC), company landing pages |
| **Job Posting** | AI-powered JD assistance, screening questions, job analytics |
| **Applicant Management** | ATS, shortlist/reject, bulk operations, resume downloads |
| **Interviews** | Schedule with calendar integration, automated reminders (multi-channel) |
| **Team Collaboration** | Multi-user accounts, roles/permissions, task management, activity logs |
| **Payments** | Razorpay integration, subscription plans, invoices (GST-compliant) |

### 3. Admin Panel

| Feature Area | Key Capabilities |
|--------------|------------------|
| **User Management** | Manage candidates/employers, verification, blocking, profile moderation |
| **Content Management** | Static pages, FAQs, blog, email templates, announcements |
| **Platform Management** | Job moderation, category management, subscription plans |
| **Analytics & Reporting** | User analytics, revenue reports, job analytics, application funnels |
| **System Settings** | Payment gateway config, notification templates, platform settings |

---

## AI-Powered Features

> **📘 For detailed AI/ML architecture, models, and implementation guide, see [AI-TOOLS-ARCHITECTURE.md](./AI-TOOLS-ARCHITECTURE.md)**

### Architecture Overview
All AI capabilities are implemented as **independent Python microservices** using **Hugging Face models**. The main backend (Node.js) queries these services via REST APIs.

### 1. AI Job Recommendation Engine
- **Model**: Sentence Transformers (`sentence-transformers/all-mpnet-base-v2`)
- **Technology**: Semantic similarity + Collaborative filtering
- **Service**: Job Recommender Microservice (Port 8002)
- **Factors**: Skills, experience, search history, location, salary expectations
- **Output**: Personalized recommendations with match scores (0-100)
- **Learning**: Continuous improvement from user actions

### 2. AI Resume Parsing
- **Models**: LayoutLM + BERT NER (`microsoft/layoutlm-base-uncased`, `dslim/bert-base-NER`)
- **Service**: Resume Parser Microservice (Port 8001)
- **Input**: PDF/Word resumes
- **Processing**: NLP-based data extraction (NER, document layout understanding)
- **Output**: Auto-filled profile fields (personal info, experience, education, skills)
- **Features**: Resume quality scoring, ATS compatibility check, improvement suggestions

### 3. Resume Quality Scoring
- **Model**: BERT Classifier (`bert-base-uncased` fine-tuned)
- **Service**: Quality Scorer Microservice (Port 8003)
- **Capabilities**: Overall quality score, ATS compatibility, keyword analysis, improvement suggestions
- **Output**: Score (0-100) with detailed breakdown and actionable feedback

### 4. AI JD Assistance (Job Description)
- **Models**: T5 / BART (`google/flan-t5-base`, `facebook/bart-large-cnn`)
- **Service**: JD Generator Microservice (Port 8005)
- **For Employers**: Auto-generate complete JDs from job title
- **Features**: Skill recommendations, keyword optimization, readability checks, SEO optimization
- **Input Methods**: Generate from scratch or optimize existing JD

### 5. Chatbot for Engagement
- **Model**: DialoGPT (`microsoft/DialoGPT-medium`)
- **Service**: Chatbot Microservice (Port 8004)
- **Capabilities**: FAQ automation, onboarding, job search help, application status queries
- **Features**: Context-aware responses, multi-turn conversations, intent recognition
- **Availability**: 24x7 automated support

### 6. Skill Extraction
- **Model**: JobBERT (`jjzha/jobbert-base-cased`, `jjzha/jobbert_skill_extraction`)
- **Service**: Skill Extractor Microservice (Port 8006)
- **Capabilities**: Extract technical and soft skills, categorize skills, skill level inference
- **Output**: Categorized skills with confidence scores and related suggestions

---

## Technical Architecture Overview

### Technology Stack (Recommended)

**Backend:**
- Node.js (Express/NestJS) or Python (Django/FastAPI)
- PostgreSQL or MySQL (primary database)
- Redis (caching, session management)
- Elasticsearch (job search indexing)
- MongoDB (optional, for logs/analytics)

**Frontend:**
- React.js with TypeScript
- Next.js (SSR/SSG for SEO)
- Zustand/Redux (state management)
- TailwindCSS or Material-UI

**Mobile:**
- React Native or Flutter (cross-platform)
- Native iOS (Swift) / Android (Kotlin) - optional

**AI/ML (Microservices):**
- Python 3.10+ with FastAPI
- PyTorch & Transformers (Hugging Face)
- Models: LayoutLM, BERT, Sentence Transformers, DialoGPT, T5/BART, JobBERT
- NLP libraries (spaCy, NLTK)
- See [AI-TOOLS-ARCHITECTURE.md](./AI-TOOLS-ARCHITECTURE.md) for details

**Infrastructure:**
- Cloud: AWS, Azure, or GCP
- Storage: AWS S3 or Azure Blob (video/documents)
- CDN: CloudFront or Cloudflare
- CI/CD: GitHub Actions, Jenkins, GitLab CI

### Key Integrations

| Service Type | Provider | Purpose |
|--------------|----------|---------|
| **Payments** | Razorpay, Stripe | Job posting subscriptions, featured listings |
| **SMS** | Twilio, MSG91 | Job alerts, OTP, interview reminders |
| **WhatsApp** | WhatsApp Business API | Alerts and notifications |
| **Email** | SendGrid, AWS SES | Transactional emails, newsletters |
| **Calendar** | Google Calendar, Outlook | Interview scheduling |
| **Video Storage** | AWS S3, Azure Blob | Video resume storage |
| **CDN** | CloudFront, Cloudflare | Fast content delivery |
| **Analytics** | Google Analytics, Mixpanel | User behavior tracking |
| **Social Login** | Google OAuth, LinkedIn API | Authentication |
| **Chatbot** | Dialogflow, Amazon Lex | AI-powered support |

---

## Development Phases

### Phase 1: MVP (16-20 weeks)
**Focus**: Launch core platform with essential features

**Epics**:
- ✅ EPIC-01: User Authentication & Authorization
- ✅ EPIC-02: Job Seeker Profile Management (Basic)
- ✅ EPIC-03: Job Search & Application System
- ✅ EPIC-04: Employer Job Posting & Management
- ✅ EPIC-05: Admin Panel (Essential features)
- ✅ EPIC-07: Payment & Subscription Management

**Deliverables**:
- Working web application
- User registration and authentication
- Job posting and application workflows
- Payment integration
- Basic admin panel

---

### Phase 2: Feature Enhancement (12-16 weeks)
**Focus**: AI-powered features and improved UX

**Epics**:
- ✅ EPIC-06: Notifications & Alerts System
- ✅ EPIC-08: AI Job Recommendation Engine
- ✅ EPIC-09: AI Resume Parsing & Analysis
- ✅ EPIC-11: Interview Scheduling System
- ✅ EPIC-12: Messaging & Communication
- ✅ EPIC-15: Analytics & Reporting

**Deliverables**:
- AI-powered job matching
- Resume parsing and quality scoring
- Multi-channel notifications
- Interview scheduling with reminders
- Comprehensive analytics

---

### Phase 3: Platform Expansion (16-20 weeks)
**Focus**: Scale platform and expand reach

**Epics**:
- ✅ EPIC-10: Video Resume & Profile
- ✅ EPIC-13: Mobile Applications (iOS & Android)
- ✅ EPIC-14: Chatbot for Engagement
- ✅ EPIC-16: Employer Branding Portal
- ✅ EPIC-17: Multi-Region Support
- ✅ EPIC-18: Team Collaboration Tools

**Deliverables**:
- Mobile apps (iOS + Android)
- Video resume functionality
- AI chatbot support
- Multi-region/multi-currency support
- Employer branding features

---

## Epic Dependency Map

```
Foundation Layer:
└─ EPIC-01: Authentication & Authorization

Core Job Seeker Features:
└─ EPIC-02: Profile Management
    ├─ EPIC-09: AI Resume Parsing
    ├─ EPIC-10: Video Resume
    └─ EPIC-03: Job Search & Application
        └─ EPIC-08: AI Recommendations

Core Employer Features:
└─ EPIC-04: Employer Job Posting
    ├─ EPIC-07: Payments
    ├─ EPIC-11: Interview Scheduling
    ├─ EPIC-16: Employer Branding
    └─ EPIC-18: Team Collaboration

Platform Management:
└─ EPIC-05: Admin Panel

Cross-Cutting Features:
├─ EPIC-06: Notifications & Alerts
├─ EPIC-12: Messaging
├─ EPIC-14: Chatbot
├─ EPIC-15: Analytics
└─ EPIC-17: Multi-Region Support

Mobile:
└─ EPIC-13: Mobile Apps (depends on most core epics)
```

---

## Key Business Rules

### Job Posting
- Jobs go live immediately after successful payment
- Job visibility based on subscription tier
- Featured/highlighted jobs require paid upgrades
- Jobs expire after deadline or subscription end

### Applications
- Candidates can apply once per job
- Application status workflow: Applied → Viewed → Shortlisted → Interview → Hired/Rejected
- Employers can download applicant resumes in bulk
- Screening questions can be required or optional

### Payments
- Pay-per-job or subscription plans
- Razorpay for India, Stripe for international
- GST-compliant invoices
- Auto-renewal for subscriptions
- Upgrade/downgrade allowed

### Notifications
- Multi-channel: Email, SMS, WhatsApp, Push
- Job alerts: Max 5 per candidate
- Alert frequency: Instant, Daily, Weekly
- Interview reminders: 24 hours and 2 hours before

### Resume & Profile
- Support PDF, DOCX, DOC formats
- AI parsing available for auto-fill
- Video resume: Max 50-100MB, 1-2 minutes
- Profile visibility: Public/Private
- Profile boost for premium users

---

## Data Models (High-Level)

### Core Entities

**Users**
- User ID, Email, Password, Role (Job Seeker/Employer/Admin)
- Profile completion percentage
- Created/Updated timestamps

**Job Seekers**
- Personal info (name, phone, location, photo)
- Work experience (company, role, duration)
- Education (degree, institution, dates)
- Skills, certifications, languages
- Job preferences (type, location, salary)
- Resume files, video resume

**Employers/Companies**
- Company name, logo, bio, website
- Industry, location, size
- Verification status, KYC documents
- Subscription plan, credits

**Jobs**
- Title, description, company
- Job type, experience level, salary range
- Location, skills required
- Application deadline
- Screening questions
- Status (active, expired, closed)

**Applications**
- Job ID, Candidate ID
- Application date, status
- Cover letter, screening answers
- Notes, ratings (by employer)

**Payments/Transactions**
- Transaction ID, amount, currency
- Payment method, gateway response
- Invoice number, GST details
- Plan/package purchased

---

## Security & Compliance

### Security Measures
- ✅ SSL/TLS encryption (HTTPS)
- ✅ Password hashing (bcrypt/Argon2)
- ✅ JWT-based authentication
- ✅ Rate limiting (API and login attempts)
- ✅ Two-factor authentication (2FA)
- ✅ Role-based access control (RBAC)
- ✅ Session management (Redis)
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection
- ✅ CSRF protection

### Compliance
- ✅ PCI-DSS (payment processing)
- ✅ GDPR (data privacy for EU users)
- ✅ CCPA (California privacy laws)
- ✅ TRAI DND (SMS in India)
- ✅ WhatsApp Business Policy
- ✅ Data encryption (at rest and in transit)

---

## Testing Strategy

### Testing Levels

**Unit Testing**
- Individual components and functions
- Coverage target: >80%
- Tools: Jest, Pytest, JUnit

**Integration Testing**
- API endpoints
- Database interactions
- Third-party integrations
- Tools: Postman, Supertest

**End-to-End (E2E) Testing**
- User workflows (registration, job application, etc.)
- Tools: Cypress, Selenium, Playwright

**Performance Testing**
- Load testing (concurrent users)
- Stress testing (peak loads)
- Tools: JMeter, k6, Artillery

**Security Testing**
- Penetration testing
- Vulnerability scanning
- Tools: OWASP ZAP, Burp Suite

**UAT (User Acceptance Testing)**
- Real users test core workflows
- Feedback collection and bug fixes

---

## Deployment & DevOps

### Environments
- **Development**: Local development setup
- **Staging**: Testing environment (mirrors production)
- **Production**: Live platform

### CI/CD Pipeline
1. Code push to GitHub/GitLab
2. Automated tests run
3. Build Docker images
4. Deploy to staging
5. Run E2E tests
6. Manual approval for production
7. Deploy to production
8. Post-deployment monitoring

### Monitoring & Logging
- **Application Monitoring**: New Relic, Datadog, Sentry
- **Server Monitoring**: CloudWatch, Prometheus, Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Alerts**: PagerDuty, Slack notifications

---

## Performance Targets

| Metric | Target |
|--------|--------|
| **Page Load Time** | < 3 seconds |
| **API Response Time** | < 500ms (p95) |
| **Database Query Time** | < 200ms (p95) |
| **Uptime** | 99.9% |
| **Concurrent Users** | 10,000+ |
| **Job Search Latency** | < 1 second |

---

## Getting Started as a Developer

### Prerequisites
- Node.js (v18+) or Python (3.10+)
- PostgreSQL or MySQL
- Redis
- Git
- Docker (optional, recommended)

### Setup Steps
1. Clone the repository
2. Install dependencies (`npm install` or `pip install -r requirements.txt`)
3. Configure environment variables (`.env` file)
4. Set up database (run migrations)
5. Seed initial data (optional)
6. Start development server
7. Run tests to verify setup

### Environment Variables (Example)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_job_portal

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d

# Payment
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-secret

# SMS
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token

# Email
SENDGRID_API_KEY=your-api-key

# AWS (for file storage)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
```

---

## Common Development Workflows

### Adding a New Feature
1. Review relevant Epic document in `DOCS/EPICS/`
2. Create feature branch (`git checkout -b feature/feature-name`)
3. Implement user stories with acceptance criteria
4. Write tests (unit + integration)
5. Update API documentation
6. Create pull request
7. Code review and approval
8. Merge to main branch
9. Deploy to staging
10. UAT and production deployment

### Bug Fixing
1. Reproduce the bug
2. Create bug fix branch (`git checkout -b fix/bug-description`)
3. Write failing test case
4. Fix the bug
5. Verify test passes
6. Create pull request
7. Deploy hotfix if critical

### Database Changes
1. Create migration file
2. Update models/schemas
3. Run migration on development
4. Test data integrity
5. Update seeding scripts (if needed)
6. Document schema changes
7. Apply to staging and production

---

## API Documentation

### API Structure
- **Base URL**: `https://api.jobportal.com/v1`
- **Authentication**: JWT Bearer token
- **Response Format**: JSON
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE

### Key API Endpoints

**Authentication**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Password reset request
- `POST /auth/reset-password` - Reset password
- `POST /auth/verify-email` - Email verification

**Job Seekers**
- `GET /candidates/profile` - Get profile
- `PUT /candidates/profile` - Update profile
- `POST /candidates/resume` - Upload resume
- `POST /candidates/video-resume` - Upload video resume
- `GET /candidates/applications` - Get all applications

**Jobs**
- `GET /jobs` - Search jobs
- `GET /jobs/:id` - Get job details
- `POST /jobs/:id/apply` - Apply to job
- `POST /jobs/:id/save` - Save job
- `GET /jobs/recommendations` - AI recommendations

**Employers**
- `POST /employers/jobs` - Create job posting
- `GET /employers/jobs` - Get all posted jobs
- `GET /employers/jobs/:id/applicants` - Get applicants
- `PUT /employers/applicants/:id/status` - Update applicant status
- `POST /employers/interviews` - Schedule interview

**Admin**
- `GET /admin/users` - Get all users
- `PUT /admin/users/:id/verify` - Verify user/company
- `GET /admin/analytics` - Platform analytics
- `POST /admin/notifications` - Send notifications

---

## Glossary

### Key Terms

- **ATS**: Applicant Tracking System
- **JD**: Job Description
- **KYC**: Know Your Customer (verification)
- **NLP**: Natural Language Processing
- **NER**: Named Entity Recognition
- **OCR**: Optical Character Recognition
- **RBAC**: Role-Based Access Control
- **2FA**: Two-Factor Authentication
- **CDN**: Content Delivery Network
- **UAT**: User Acceptance Testing
- **MVP**: Minimum Viable Product

### User Roles

- **Job Seeker/Candidate**: Person searching for jobs
- **Employer/Recruiter**: Company/HR posting jobs
- **Admin/Super Admin**: Platform administrator
- **Team Member**: Employer's team member with limited permissions

### Job Types

- **Full-time**: Permanent employment
- **Part-time**: Reduced hours employment
- **Contract**: Fixed-term employment
- **Gig**: On-demand, short-term work
- **Remote**: Work from home/anywhere

---

## FAQs for Developers

**Q: What's the recommended tech stack?**
A: Backend: Node.js/Python, Frontend: React.js/Next.js, Database: PostgreSQL, Mobile: React Native

**Q: Where are the detailed user stories?**
A: Check individual Epic documents in `DOCS/EPICS/` folder

**Q: How is AI implemented?**
A: Python-based ML models for recommendations, resume parsing via NLP libraries or third-party APIs

**Q: What payment gateways are used?**
A: Razorpay (India), Stripe (International)

**Q: Are mobile apps native or cross-platform?**
A: Recommended: React Native or Flutter for faster development and code reuse

**Q: How are notifications sent?**
A: Multi-channel: Email (SendGrid), SMS (Twilio), WhatsApp (Business API), Push (Firebase)

**Q: Is there a staging environment?**
A: Yes, staging environment should mirror production setup

**Q: How is file storage handled?**
A: Cloud storage (AWS S3 or Azure Blob) with CDN for delivery

**Q: What's the testing approach?**
A: Unit tests, integration tests, E2E tests, performance tests, and UAT

**Q: How are database migrations managed?**
A: Use migration tools like Sequelize (Node.js), Alembic (Python), or Prisma

---

## Next Steps

### For New Developers
1. Read this document (CLAUDE.md)
2. Review `STATEMENT_OF_WORK.md` for detailed requirements
3. Check `EPICS/README.md` for development roadmap
4. Read relevant Epic documents for features you'll work on
5. Set up development environment
6. Join team communication channels
7. Attend onboarding sessions

### For Product Managers
1. Review Epic documents for scope and user stories
2. Prioritize epics based on business value
3. Create product roadmap with timelines
4. Define success metrics and KPIs
5. Coordinate with stakeholders for approvals

### For QA Engineers
1. Review acceptance criteria in Epic documents
2. Create test plans and test cases
3. Set up test automation framework
4. Plan UAT scenarios with users
5. Define quality gates for releases

---

## Resources & References

### Documentation
- **Statement of Work**: `DOCS/STATEMENT_OF_WORK.md`
- **AI/ML Architecture**: `DOCS/AI-TOOLS-ARCHITECTURE.md`
- **Epic Index**: `DOCS/EPICS/README.md`
- **API Documentation**: TBD (Swagger/OpenAPI)
- **Database Schema**: TBD (ERD diagrams)

### External Services
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Stripe Documentation](https://stripe.com/docs)
- [Twilio SMS API](https://www.twilio.com/docs/sms)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Google Calendar API](https://developers.google.com/calendar)
- [Dialogflow](https://cloud.google.com/dialogflow/docs)

---

## Support & Contact

For questions or clarifications:
- **Project Manager**: [To be assigned]
- **Technical Lead**: [To be assigned]
- **Product Owner**: [To be assigned]

---

**Document Version**: 2.0
**Last Updated**: 2025-10-04
**Maintained By**: Project Documentation Team

---

## Epic Documentation Status

All 18 epic documents have been completed and are available in the `DOCS/EPICS/` directory:

| Epic | Status | File |
|------|--------|------|
| EPIC-01: User Authentication & Authorization | ✅ Complete | [EPIC-01-USER-AUTHENTICATION.md](./EPICS/EPIC-01-USER-AUTHENTICATION.md) |
| EPIC-02: Job Seeker Profile Management | ✅ Complete | [EPIC-02-JOB-SEEKER-PROFILE.md](./EPICS/EPIC-02-JOB-SEEKER-PROFILE.md) |
| EPIC-03: Job Search & Application System | ✅ Complete | [EPIC-03-JOB-SEARCH-APPLICATION.md](./EPICS/EPIC-03-JOB-SEARCH-APPLICATION.md) |
| EPIC-04: Employer Job Posting & Management | ✅ Complete | [EPIC-04-EMPLOYER-JOB-POSTING.md](./EPICS/EPIC-04-EMPLOYER-JOB-POSTING.md) |
| EPIC-05: Admin Panel & Platform Management | ✅ Complete | [EPIC-05-ADMIN-PANEL.md](./EPICS/EPIC-05-ADMIN-PANEL.md) |
| EPIC-06: Notifications & Alerts System | ✅ Complete | [EPIC-06-NOTIFICATIONS-ALERTS.md](./EPICS/EPIC-06-NOTIFICATIONS-ALERTS.md) |
| EPIC-07: Payment & Subscription Management | ✅ Complete | [EPIC-07-PAYMENT-SUBSCRIPTION.md](./EPICS/EPIC-07-PAYMENT-SUBSCRIPTION.md) |
| EPIC-08: AI Job Recommendation Engine | ✅ Complete | [EPIC-08-AI-JOB-RECOMMENDATIONS.md](./EPICS/EPIC-08-AI-JOB-RECOMMENDATIONS.md) |
| EPIC-09: AI Resume Parsing & Analysis | ✅ Complete | [EPIC-09-AI-RESUME-PARSING.md](./EPICS/EPIC-09-AI-RESUME-PARSING.md) |
| EPIC-10: Video Resume & Profile | ✅ Complete | [EPIC-10-VIDEO-RESUME.md](./EPICS/EPIC-10-VIDEO-RESUME.md) |
| EPIC-11: Interview Scheduling System | ✅ Complete | [EPIC-11-INTERVIEW-SCHEDULING.md](./EPICS/EPIC-11-INTERVIEW-SCHEDULING.md) |
| EPIC-12: Messaging & Communication | ✅ Complete | [EPIC-12-MESSAGING-COMMUNICATION.md](./EPICS/EPIC-12-MESSAGING-COMMUNICATION.md) |
| EPIC-13: Mobile Applications (iOS & Android) | ✅ Complete | [EPIC-13-MOBILE-APPLICATIONS.md](./EPICS/EPIC-13-MOBILE-APPLICATIONS.md) |
| EPIC-14: Chatbot for Engagement | ✅ Complete | [EPIC-14-CHATBOT-ENGAGEMENT.md](./EPICS/EPIC-14-CHATBOT-ENGAGEMENT.md) |
| EPIC-15: Analytics & Reporting | ✅ Complete | [EPIC-15-ANALYTICS-REPORTING.md](./EPICS/EPIC-15-ANALYTICS-REPORTING.md) |
| EPIC-16: Employer Branding Portal | ✅ Complete | [EPIC-16-EMPLOYER-BRANDING.md](./EPICS/EPIC-16-EMPLOYER-BRANDING.md) |
| EPIC-17: Multi-Region Support | ✅ Complete | [EPIC-17-MULTI-REGION-SUPPORT.md](./EPICS/EPIC-17-MULTI-REGION-SUPPORT.md) |
| EPIC-18: Team Collaboration Tools | ✅ Complete | [EPIC-18-TEAM-COLLABORATION.md](./EPICS/EPIC-18-TEAM-COLLABORATION.md) |
