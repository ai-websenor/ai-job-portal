# Changelog

All notable changes to the AI Job Portal will be documented in this file.

## [v0.6.0] - 2026-03-13

### Admin Panel Setup & Deployment

#### Features
- Admin panel web AWS Amplify config and deploy workflow
- Admin panel Amplify app ID setup
- Rename admin panel to "Radient Job Board"
- Add admin panel Amplify domain to CORS_ORIGINS
- Re-enabled auto-release workflow

---

## [v0.5.0] - 2026-03-13

### Subscriptions, Filters & OTP

#### Features
- Subscription plans with plan cards, dynamic data fetching & expanded details
- Free plan logic to disable card selection and upgrade button
- Plan upgrade functionality with API endpoint and UI integration
- Subscription usage & history pages with pagination
- Job publishing flow with new API endpoint and UI
- List filters: interview (candidate, status, date range), applications (debounced search), employer & candidate filters
- OTP resend functionality with countdown timer and local storage persistence
- Label changes: "Hired" → "Selected", "Pay Rate Period" → "Pay Type"
- Admin panel web files (initial setup)
- Chat message grouping by day with date separators
- Chat infinite scroll for loading older messages
- Profile tab redirection for incomplete sections
- Education/experience: `currentlyStudying` logic, dynamic end date visibility

#### Fixes
- Email notification issues (company registration, production sending)
- Job type issues
- Subscription cancel updates
- Swagger docs and examples
- Validate date issues
- Location key in work-experience and education
- Boolean and date field standardization in education/experience forms

---

## [v0.4.0] - 2026-03-13

### Chat, Permissions & Dashboard

#### Features
- Real-time chat with WebSocket integration and message display updates
- Chat attachments: upload, preview, metadata, S3 file handling
- Chat API integration with dynamic room details and message history
- i18n/internationalization with Hindi/English locales and language switcher
- Permission-based UI access control for interviews, applications, members
- Profile completion tracking component with API endpoint
- Dashboard analytics for employer and candidate
- Job chatbot integration
- Notification preferences management (turn on/off)
- Custom animated notification bar with auto-dismissal
- Resume download with pre-signed URLs
- Resume data extraction prompt improvements
- Job details enhanced with comprehensive attributes, skills, benefits, company info
- Hire button and confirmation dialog for applicant management
- Profile photo deletion for both candidate and employer
- Saved jobs with authentication and real-time status updates
- Step locking for employee onboarding progression
- Date dividers in chat messages
- Emoji picker in chat footer
- Interview cancellation with dedicated dialog and validation

#### Fixes
- Resume upload limit (5), template storing removed
- Resume download issues on candidate side
- Work mode filter fixes
- Inactive jobs removed from listings
- S3 upload issues in company GST upload
- CORS fixes
- Years-based filtering
- Company type field added to basic details form
- Skill proficiency default beginner removed

#### Refactoring
- Chat attachment upload extracted into separate component
- Error logging standardized from console.error to console.log
- Resume primary selection UI improved
- Removed language switcher from header (kept i18n support)
- Firebase initialization relocated to main layout

---

## [v0.3.0] - 2026-03-13

### Jobs, Interviews & Resume Builder

#### Features
- Dynamic job applications with status management (shortlist, reject, view tracking)
- Interview scheduling, rescheduling & cancellation with dedicated dialogs
- Interview list with filtering by candidate name, status, and date range
- Complete resume builder with Handlebars templates, PDF generation, and personal/education/skills/certifications sections
- Application tracking timeline component
- Google OAuth callback page for authentication
- Job search filters (salary range, pay rate, industry, work modes) with dynamic options from API
- Profile enhancements: avatar selection with gender filter, education/experience editing
- Change password page with validation
- Application analytics for employer and candidate dashboards
- Onboarding resume parsing to pre-fill forms
- Step-by-step onboarding with URL-based progression
- Applicant status updates (reject, shortlist, hire) from interview list
- GST document download, profile photo pre-signed URL uploads
- Messaging APIs with pagination and chat history
- Admin dashboard with master-typed and user-typed filters

#### Fixes
- Employee flow bugs and form validation
- Profile photo upload converted to pre-signed URLs
- Resume prompt improvements and data extraction
- OTP in response for testing
- Skill autocomplete, education free-type for candidates
- S3 CORS config independence from public access setup

#### Refactoring
- Applicant data structure refactored to nested `jobSeeker` object
- Application status mapping to `InterviewStatus` enum
- Resume primary selection UI improvements
- Notice period option keys updated to numbers
- Migrated company logos to next/image

---

## [v0.2.0] - 2026-03-13

### Foundation & Core Infrastructure

#### Features
- Employer permissions & granular role management with individual enable/disable states
- Company registration with logo, banner, and GST document uploads
- Push notification phase 1 — Firebase Cloud Messaging with device token registration
- Custom resume template builder with live preview
- Signed URL file upload system (generic for various attachment types)
- Job CRUD with category/subcategory selection and dynamic job preview
- Notification APIs with UI drawer, cards, mark-all-read, and delete
- Notification pagination and unread count
- Change password functionality
- Employee dashboard image assets
- GST document download and pre-signed URL endpoints

#### Fixes
- ECS task definition credential cleanup
- Date validation in education forms
- Response structure standardization with meaningful messages and status codes
- Custom logger issues
- Job service and application service failures
- Thumbnail upload issues
- Hashing removed from GST and PAN numbers

#### Refactoring
- Standardized string literals to single quotes across employee profile components
- Externalized tab state management in MemberForm
- Generalized file upload functionality for various attachment types
- Made `useSignedUrl` hook generic with optional duration parameter
