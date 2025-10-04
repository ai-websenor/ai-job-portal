# EPIC-16: Employer Branding Portal

## Epic Overview
Create a comprehensive employer branding portal that enables companies to showcase their culture, values, and work environment through custom company pages, rich media galleries, employee testimonials, and premium branding features.

---

## Business Value
- Differentiate premium employer offerings
- Generate additional revenue (premium branding)
- Attract quality candidates
- Improve employer brand visibility
- Enhance candidate experience
- Increase application quality

---

## User Stories

### US-16.1: Custom Company Landing Page
**As an** employer
**I want** a branded company page
**So that** candidates learn about my organization

**Acceptance Criteria:**
- Custom company URL: /company/[company-name]
- Page sections:
  - Hero banner with company logo and tagline
  - About the company
  - Mission and vision
  - Company culture
  - Values and principles
  - Employee benefits
  - Work environment
  - Awards and recognitions
  - Office locations
  - Team size and structure
- Rich text editor for content
- Image and video uploads
- SEO-optimized pages
- Social media links
- Contact information
- "See Open Positions" CTA

### US-16.2: Photo & Video Gallery
**As an** employer
**I want** to showcase workplace photos and videos
**So that** candidates see our culture

**Acceptance Criteria:**
- Upload multiple photos (max 50)
- Upload videos (max 5, 100MB each)
- Gallery categories:
  - Office spaces
  - Team events
  - Products/projects
  - Community initiatives
  - Awards ceremonies
- Image slider/carousel
- Video player integration
- Captions and descriptions
- Responsive gallery layout
- High-resolution image support

### US-16.3: Employee Testimonials
**As an** employer
**I want** to feature employee testimonials
**So that** candidates hear from our team

**Acceptance Criteria:**
- Add employee testimonials
- Testimonial fields:
  - Employee name
  - Job title
  - Photo
  - Quote/testimonial text
  - Duration at company
- Video testimonials (optional)
- Display as cards/carousel
- Feature up to 10 testimonials
- Approval workflow before publishing

### US-16.4: Company Stats & Highlights
**As an** employer
**I want** to display key company metrics
**So that** candidates understand our scale

**Acceptance Criteria:**
- Display stats:
  - Years in business
  - Number of employees
  - Office locations count
  - Products/clients served
  - Annual revenue (optional)
  - Growth rate
  - Industry ranking
- Visual counters/animations
- Icons for each stat
- Customizable stats
- Update anytime

### US-16.5: Featured Jobs Section
**As an** employer
**I want** to highlight top jobs
**So that** they get more visibility

**Acceptance Criteria:**
- "Featured Jobs" section on company page
- Select up to 5 jobs to feature
- Jobs displayed prominently
- Quick apply option
- Link to all open positions
- Auto-update when jobs close
- Premium feature (paid)

### US-16.6: Premium Branding Features
**As an** employer
**I want** premium branding options
**So that** my company stands out

**Acceptance Criteria:**
- Premium features:
  - Custom color scheme (brand colors)
  - Remove platform branding
  - Custom domain (jobs.company.com)
  - Verified employer badge (priority)
  - Featured in employer directory
  - Homepage banner ad slot
  - Sponsored job listings
  - Enhanced analytics
- Subscription-based pricing
- Feature upgrade options
- Compare free vs premium

### US-16.7: Company Blog/News
**As an** employer
**I want** to publish company news
**So that** candidates stay informed

**Acceptance Criteria:**
- Blog/news section
- Create news articles
- Rich text editor
- Add images and videos
- Publish or save as draft
- Schedule publication
- Categories and tags
- Comments (optional)
- Social sharing
- RSS feed

### US-16.8: Career Growth Opportunities
**As an** employer
**I want** to showcase career paths
**So that** candidates see growth potential

**Acceptance Criteria:**
- Career path visualization
- Department-wise career ladders
- Skills required per level
- Typical career progression
- Employee success stories
- Learning and development programs
- Mentorship opportunities
- Promotion policies

### US-16.9: Company Culture Videos
**As an** employer
**I want** to create a company culture video
**So that** candidates experience our workplace

**Acceptance Criteria:**
- Upload company culture video
- Prominent placement on page
- Video specs: Max 5 minutes, 200MB
- Auto-play option (muted)
- Thumbnail image
- Video analytics (views, watch time)
- Embed video from YouTube/Vimeo

### US-16.10: Employer Directory
**As a** job seeker
**I want** to browse companies
**So that** I discover potential employers

**Acceptance Criteria:**
- Public employer directory
- Search and filter companies:
  - By industry
  - By location
  - By company size
  - Verified only
  - Premium/featured only
- Company cards showing:
  - Logo
  - Name and tagline
  - Industry
  - Location
  - Open jobs count
  - Verified badge
- Click to view company page
- Sort by (relevance, newest, most jobs)

---

## Technical Requirements

### Content Management
- Rich text editor (TinyMCE, Quill)
- Image upload and processing
- Video upload and transcoding
- CDN for media delivery
- SEO optimization (meta tags, schema.org)

### Database Schema

**Company Pages Table:**
```sql
company_pages (
  id: UUID PRIMARY KEY,
  company_id: UUID FOREIGN KEY,
  slug: VARCHAR(255) UNIQUE,
  hero_banner_url: VARCHAR(500),
  tagline: VARCHAR(255),
  about: TEXT,
  mission: TEXT,
  culture: TEXT,
  benefits: JSONB,
  is_published: BOOLEAN,
  branding_tier: ENUM('free', 'premium', 'enterprise'),
  custom_domain: VARCHAR(255),
  custom_colors: JSONB,
  seo_title: VARCHAR(100),
  seo_description: VARCHAR(255),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

**Company Media Table:**
```sql
company_media (
  id: UUID PRIMARY KEY,
  company_id: UUID FOREIGN KEY,
  media_type: ENUM('photo', 'video'),
  media_url: VARCHAR(500),
  thumbnail_url: VARCHAR(500),
  category: VARCHAR(100),
  caption: TEXT,
  display_order: INTEGER,
  created_at: TIMESTAMP
)
```

**Employee Testimonials Table:**
```sql
employee_testimonials (
  id: UUID PRIMARY KEY,
  company_id: UUID FOREIGN KEY,
  employee_name: VARCHAR(255),
  job_title: VARCHAR(255),
  photo_url: VARCHAR(500),
  testimonial: TEXT,
  video_url: VARCHAR(500),
  is_approved: BOOLEAN,
  display_order: INTEGER,
  created_at: TIMESTAMP
)
```

---

## API Endpoints

```
GET    /api/v1/company/:slug                   - Get company page
PUT    /api/v1/employer/company-page           - Update company page
POST   /api/v1/employer/company-page/media     - Upload media
DELETE /api/v1/employer/company-page/media/:id - Delete media

POST   /api/v1/employer/testimonials           - Add testimonial
GET    /api/v1/employer/testimonials           - List testimonials
PUT    /api/v1/employer/testimonials/:id       - Update testimonial
DELETE /api/v1/employer/testimonials/:id       - Delete testimonial

GET    /api/v1/companies                       - List all companies (directory)
GET    /api/v1/company/:slug/analytics         - Company page analytics
```

---

## Success Metrics

- Company page completion rate > 70%
- Premium branding upsell conversion > 15%
- Company page views → job views > 40%
- Avg time on company page > 2 minutes
- Application rate from company page > 10%

---

## Timeline Estimate
**Duration:** 3-4 weeks

### Week 1: Company Page Builder
- Page structure
- Content editor
- Image/video upload
- Preview functionality

### Week 2: Media & Testimonials
- Gallery implementation
- Video integration
- Testimonials section
- Analytics tracking

### Week 3: Premium Features
- Custom branding options
- Featured placements
- Employer directory
- Custom domain setup

### Week 4: Testing & Launch
- QA testing
- SEO optimization
- Performance testing
- Documentation

---

## Related Epics
- EPIC-04: Employer Job Posting (company profile)
- EPIC-07: Payment (premium branding subscription)
- EPIC-15: Analytics (company page analytics)

---

**Epic Owner:** Full-Stack Team Lead
**Priority:** Medium (Revenue opportunity)
