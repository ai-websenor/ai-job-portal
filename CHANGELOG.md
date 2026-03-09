# Changelog

## [0.7.0] - 2026-03-09

### Added
- Architecture tab (6th tab) focused on AI model & SageMaker cost
- Model Details: Mistral 14B (Ministral-3-14B-Instruct-2512), capabilities per feature, why this model
- Serving Config: ml.g5.2xlarge specs, vLLM/DJL container config, timeouts
- How It Works: Python ↔ SageMaker request/response flow diagram
- Current Cost: ml.g5.2xlarge monthly breakdown (~$1,328/mo), per-request estimates
- Instance Comparison: 7 GPU instances with real ap-south-1 pricing + recommendations
- Savings Plan & Spot pricing options
- Lazy-loaded architecture.js with sidebar nav + scroll-spy

## [0.6.0] - 2026-03-09

### Added
- API Documentation tab (5th tab after Changelog)
- Stripe-style layout: left sidebar nav + 2-column main content (description + code examples)
- Type definitions for all request/response objects (ConfidenceField, ResumeOutput, etc.)
- Code examples in 3 languages: cURL, Python, JavaScript with tab switcher
- Persistent language selection across all code blocks
- Copy-to-clipboard button on all code blocks
- Scroll-spy sidebar highlighting
- Getting Started section with base URL, auth info, and shared type definitions
- 4 AI endpoints documented: /parse, /parse-s3, /chat, /recommend
- Responsive layout: sidebar collapses on mobile
- Lazy-loaded docs.js (only loads when tab clicked)

## [0.5.0] - 2026-03-08

### Added
- WhatsApp-style chat UI: multi-bubble bot responses with 1500ms staggered delay
- Send/receive sound effects via Web Audio API (sine wave oscillators)
- Blue theme across entire chat interface (header, bubbles, buttons, sidebar)
- Transparent overlay on chat area when no job/user selected
- 3 info sidebar panels: Job Details, Company Info, Candidate Profile (SVG icons)
- Full candidate profile sidebar: skills, education, work experience, certifications, projects, languages, resume link
- `GET /user/{user_id}` endpoint with complete profile data (education, experience, certs, projects, languages)
- `GET /job/{job_id}` endpoint for sidebar JD and company info
- Search-and-select dropdowns for Job ID and User ID with debounced search
- Auto session management with localStorage persistence per job+user combo
- Chat timestamps with date separators (Today/Yesterday/formatted date)
- URL-based tab persistence (`?tab=chat` survives page refresh)
- Context-aware chat suggestions: 3 topic categories (job/company/work mode), max 4-6 words
- JSON repair for truncated LLM responses
- Typing indicator animation between bot bubbles
- Bubble entrance CSS animation

### Changed
- Chat response format: `messages: list[str]` array (multi-bubble), backward compatible with single `response` field
- LLM max_tokens increased to 2048
- Suggestion prompt forces cross-topic diversity (A: job/skills/salary, B: company/culture, C: work mode/location)
- `fetch_user_profile` DB query now fetches education, experience, certifications, projects, languages
- Sidebar cache stores rendered HTML per panel (instant switching without re-fetch)

### Fixed
- Suggestion click causing page navigation (synthetic submit event → direct function call)
- AudioContext suspended by browser autoplay policy (added resume() call)
- Typing indicator stretching full width (width: fit-content)
- Chat area scrolling whole page instead of internal scroll (flex + min-height: 0)
- Sidebar showing stale content when switching between JD/Company/Candidate panels

## [0.4.0] - 2026-03-08

### Added
- Personalized chatbot: optional `user_id` field on `/chat` endpoint
- When provided, fetches candidate profile (name, skills, experience, location) from DB
- LLM addresses user by name, relates their skills to job requirements, highlights matches and gaps
- User ID input field in chat UI sidebar
- OpenAPI example for personalized chat usage
- 2 new chat tests (invalid user_id format, backward compatibility)

### Unchanged
- Without `user_id`, chatbot behavior is identical to before (fully backward compatible)

## [0.3.2] - 2026-03-08

### Added
- Changelog tab in testing console UI (`/ui`)
- `GET /changelog` endpoint serving CHANGELOG.md as plain text
- marked.js CDN for client-side markdown rendering
- Tailwind typography plugin for `prose` styling
- Lazy-load: changelog fetched only on tab click, cached after first load

## [0.3.1] - 2026-03-08

### Added
- Custom exception hierarchy (AppError, ExternalServiceError, DatabaseError, ExtractionError)
- Pydantic input validators on all endpoints (UUID, length, range)
- Valkey (Redis) session storage for chatbot with in-memory fallback
- `s3_uploaded` flag in /parse response (S3 failure no longer blocks parse)
- Empty parse detection → 422 with helpful message
- OpenAPI error responses (400, 404, 422, 503) on all endpoints
- ErrorResponse schema in OpenAPI spec
- Error messages reference doc (`docs/error-messages.md`)
- 16 new negative test cases across all endpoints

### Changed
- `/recommend` user_id is now **required** (was optional)
- SageMaker: catch throttle/timeout/cold-start with specific error messages
- S3: NoSuchKey→404, AccessDenied→503, filename sanitization
- DB: connect_timeout=5s, statement_timeout=30s, error wrapping
- Extractors: catch corrupt PDF/DOCX → 422 ExtractionError
- `/parse-s3`: DB save failure logged but doesn't fail response

### Fixed
- Potential KeyError in `insert_job_recommendations` (uses `.get()` now)
- Recommendation score parsing crash on non-numeric LLM output

## [0.3.0] - 2026-03-08

### Added
- Upgraded from Mistral 7B to Ministral 14B on SageMaker (DJL LMI/vLLM, native FP8)
- Streaming inference via `invoke_endpoint_with_response_stream` (bypasses 60s SageMaker limit)
- 13 new PersonalInfo fields: first_name, last_name, city, state, country, github, website, summary, headline, date_of_birth, gender, nationality, marital_status
- Experience.location field
- Education.grade and Education.description fields
- 5 new resume sections: projects, achievements, publications, languages, hobbies
- UI rendering for all new sections (projects, achievements, publications, languages, hobbies)
- OpenAPI spec updated with all new schemas and examples

### Fixed
- Bullet-point descriptions now get high confidence (was 0.0, now 0.9-1.0)
- JSON truncation fix — max_tokens increased to 6000
- Streaming response parsing for DJL/vLLM chunked output

## [0.2.0] - 2026-03-07

### Added
- Resume parsing with Mistral 7B on SageMaker
- Job-contextual chatbot
- LLM-ranked job recommendations
- S3 upload/download integration
- Testing UI with tabs for parse, chat, recommend
- OpenAPI 3.0 spec
- GitHub Actions CI/CD, ECS Fargate deployment

## [0.1.0] - 2026-03-07

### Added
- Initial resume parser prototype
- PDF and DOCX text extraction
- Basic structured JSON output
