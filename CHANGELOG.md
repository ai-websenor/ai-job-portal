# Changelog

## [0.14.1] - 2026-07-19

### Fixed
- Aligned app and EC2 defaults on `Qwen/Qwen2.5-3B-Instruct`.
- Grounded conflicting phone and India location values against resume text.
- Removed unsupported project and explicit-only personal values from parser output.
- Centralized parser finalization and personal-field merging to prevent mode/schema drift.
- Removed resume values from new validation logs.

## [0.14.0] - 2026-06-28

### Changed
- Replaced SageMaker runtime transport with private HTTP LLM transport for EC2-hosted vLLM.
- Default model config now targets `Qwen/Qwen2.5-3B-Instruct` at `LLM_BASE_URL`.
- Qwen3.5 4B was attempted on `g4dn.xlarge` but did not serve reliably due multimodal encoder startup on T4.
- Reduced default context/output caps for `g4dn.xlarge` startup safety.
- Set Qwen vLLM context and whole-parse threshold to `12000` for dev and staging.
- Added Qwen EC2 scheduler code for EventBridge start/stop.
- Updated ECS task env, docs, OpenAPI, and architecture UI for EC2 Qwen serving.

### Added
- `docs/qwen-ec2-runbook.md` with AWS setup, service relationships, QA checks, and rollback.
- Unit tests for OpenAI-compatible LLM success, timeout, retry, and empty response paths.

## [0.13.0] - 2026-04-21

### Changed
- **Whole-document single-call parsing is the new default** (`parse_mode=whole`). `/parse` and `/parse-s3` send the full raw resume text to the LLM in one call and reuse the existing merge/dedup/coercion pipeline by wrapping the parsed JSON as a 1-element list. Benches on `ml.g5.2xlarge` + Ministral 14B:
  - 1-page to 6-page resumes complete in 50–120s per call, 1× to 3× concurrent
  - Output quality materially better than per-chunk partial-JSON merge (fewer dropped projects, correct `headline` / `professionalSummary`, properly classified experience-vs-projects out of the box)
- **Automatic fallback ladder** in `_parse_resume_sync`:
  1. Whole path (single call) when `len(text) <= whole_path_max_chars` (default 15000)
  2. Raw char-chunked merge when text exceeds threshold, or when the whole call fails to return parseable JSON
  3. `parse_mode=chunked` kept only as explicit override for emergency rollback — marked DEPRECATED in logs
- `/parse-whole` debug endpoint retained unchanged for side-by-side comparison.

### Added
- `app/parser/chunked_processor.py::process_whole` — single LLM call, one low-temperature retry on JSON failure, feeds `merge_page_results([parsed])` so coercion, dedup, and the experience→project reclassifier run for free.
- `app/parser/chunked_processor.py::WholeParseFailed` — raised when both temp=0.1 and temp=0.01 calls return unparseable output, signaling the main dispatch to fall back.
- `app/parser/sagemaker.py::invoke_mistral_whole` — sync wrapper matching `invoke_mistral_raw` shape.
- New `Settings` fields: `whole_path_max_chars=15000`, `whole_call_timeout_seconds=600`, `whole_max_tokens=16000`. All env-tunable.

### Notes
- Frontend `/ui` and all API consumers see no contract change; endpoint paths, request shapes, and `ResumeOutput` schema are identical. Internals swapped, surface stable.
- Whole-path output now benefits from the same post-processing as raw: `_fix_date_value` normalizes `"2021"` → `"2021-01-01"`, skill deduplication runs, empty `designation` mirrors `title`.

## [0.12.1] - 2026-04-21

### Changed
- Per-chunk LLM timeouts raised from 120s to **600s** to stop losing data on cold-start / GPU-contended runs (observed a single page generation reaching ~75s; had zero headroom for 3-way concurrent contention on the A10G).
- Three timeout layers now aligned to the same 600s budget and all env-tunable:
  - `raw_call_timeout_seconds` (asyncio wait_for, `app/parser/chunked_processor.py`): 120 → 600
  - `llm_read_timeout_seconds` (boto3 sagemaker-runtime read_timeout, `app/parser/sagemaker.py`): 120 → 600 (previously hard-coded, now in `Settings`)
  - `llm_semaphore_wait_seconds` (threading Semaphore acquire on parse pool, `app/parser/sagemaker.py`): 120 → 600 (previously hard-coded)
- New `Settings` fields with env overrides: `LLM_READ_TIMEOUT_SECONDS`, `LLM_CONNECT_TIMEOUT_SECONDS`, `LLM_SEMAPHORE_WAIT_SECONDS`, `LLM_INTERACTIVE_SEMAPHORE_WAIT_SECONDS`.
- Interactive (chat) semaphore wait held at 30s — chat UX stays snappy; only parse pool was starving.

## [0.12.0] - 2026-04-20

### Added
- **Raw per-page extraction pipeline** (`parse_mode=raw`, now default). 1 PDF page = 1 LLM call with the full `ResumeOutput` schema; pages merged with per-field dedup. Eliminates regex-based section detection which was silently dropping data on resumes with inline headers or unrecognized section names.
- `app/parser/chunk_prompts.py::RAW_UNIFIED_PROMPT` — unified per-page prompt returning the complete schema; missing fields come back as `""` / `[]`.
- `app/parser/chunked_processor.py::process_raw`, `merge_page_results` — fan-out per page + field-specific dedup:
  - `personalDetails`: first-non-empty per sub-field across pages
  - `experienceDetails`: dedup by `(title, company, startDate)` with cross-page description merge for entries split across pages
  - `skills`: dedup by `skillName`, preferring higher `proficiencyLevel`
  - `projects`: dedup by `name` with description merge
  - `educationalDetails` / `certifications` / `languages`: natural-key dedup
- `app/extractors/pdf.py::extract_pages_from_pdf` — returns `(pages: list[str], page_count)` for page-level processing. Back-compat wrapper `extract_text_from_pdf` preserved.
- PDF ligature unwrap (`Ɵ→ti`, `ƫ→tti`, `ﬁ→fi`, `ﬀ→ff`, `ﬂ→fl`, `ﬃ→ffi`, `ﬄ→ffl`, `ﬅ→ft`, `ﬆ→st`) applied in `_unwrap_ligatures` before downstream processing.
- `parse_mode: "raw" | "chunked"` env-driven feature flag with `"raw"` as default; `chunked` path fully retained for instant rollback via `PARSE_MODE=chunked`.
- Config knobs: `raw_call_timeout_seconds=120`, `raw_max_pages=15`, `raw_chunk_max_chars=1500`, `raw_chunk_min_chars=50`, `raw_chunk_max_tokens=2000`.
- **Char-based semantic chunking** (supersedes page-based): `chunk_text_for_raw()` splits text into ~1,500-char chunks on paragraph → line → sentence boundaries. Partial-JSON prompt allows the LLM to omit top-level keys that aren't present in a given chunk — cuts output tokens dramatically vs forcing full-schema echo.
- **Automatic retry on JSON parse failure**: if a chunk's LLM response is malformed, one retry at `temperature=0.0` (greedy decoding). Both failed raw responses dumped to `/tmp/resume-parser-debug/` for diagnosis.
- `tests/test_raw_parser.py` — ligature unwrap, page extraction, merge dedup rules, cross-page experience merge, empty-page skip, one-page-fail tolerance, PDF-only enforcement. Live-endpoint smoke tests opt-in via `RUN_LIVE_LLM=1`.

### Changed
- **PDF-only policy** — `/parse` and `/parse-s3` reject DOCX uploads. `app/extractors/docx.py` remains in-tree but unused.
- App version `0.11.0` → `0.12.0`.

### Fixed
- Dvg.pdf / Latest.pdf losing Technical Skills section — PDF extracted "Technical Skills" inline with summary paragraph, defeating the `^Technical Skills$` regex anchor. Raw mode sees skills wherever they appear.
- VishwanathHiremath_Front (1).pdf losing RESPONSIBILITIES bullets — header not in the section regex; bullets were absorbed into the preceding projects section. Raw prompt classifies RESPONSIBILITIES content as experience responsibilities.

## [0.11.0] - 2026-04-02

### Changed
- **BREAKING**: Replaced confidence-score schema with flat form-compatible output — all models now use plain strings/bools/dates instead of `{value, confidence}` wrappers
- Models: `ConfidenceField` removed; new `PersonalDetails`, `ExperienceDetail`, `SkillDetail`, `EducationalDetail`, `CertificationDetail`, `ProjectDetail`, `LanguageDetail`
- All LLM prompts rewritten for form-schema fields (camelCase), YYYY-MM-DD dates, empty string "" for missing text (no more null+confidence 0.0)
- `upload_to_s3` returns `{key, url}` dict instead of bare key string
- Frontend result viewer simplified to raw JSON (confidence badges removed)
- DB `insert_parsed_resume` field names aligned to new schema (`personalDetails`, `experienceDetails`, `educationalDetails`)

### Added
- Global `_parse_gate` semaphore — limits concurrent parse jobs across all requests
- Per-parse `_per_parse_sem` semaphore — limits concurrent LLM calls within a single parse
- Placeholder string detection (`_is_placeholder`) — strips "N/A", "Not Specified", etc. from LLM output
- URL fixers for LinkedIn/GitHub — auto-prefix `https://`, strip incomplete URLs
- Experience deduplication by title+company+startDate
- `_coerce_flat_fields` replaces `_sanitize_confidence_fields` — handles type coercion for flat schema

### Removed
- `ConfidenceField` model and all confidence-related logic
- `achievements`, `publications`, `hobbies`, `declaration` from `ResumeOutput` (not in onboarding form)
- Confidence badge CSS classes and per-section HTML renderers in frontend

## [0.10.0] - 2026-04-01

### Changed
- Replaced pdfplumber with pypdfium2 (MIT, 25x faster) for PDF text extraction
- Multi-column resumes now parsed correctly — pypdfium2 reads in visual order (left col → right col) instead of merging columns left-to-right

### Fixed
- Two-column resumes (e.g., ChloeMartinezResume.pdf) missing education, skills, certifications, achievements — section headers were merged mid-line by pdfplumber, breaking regex detection (3→9 sections detected)
- "KEY ACHIEVEMENTS" and "KEY STRENGTHS" section headers now matched by updated regex patterns

## [0.9.0] - 2026-03-13

### Added
- Per-section chunked processing: 1 LLM call per resume section (up to 11), all parallel via asyncio.gather
- 11 focused prompt templates (~200-400 tokens each) replacing 3 overloaded prompts
- Section splitter with regex header detection for 12 section types
- Token estimator for dynamic per-section token allocation
- Job store module for background job tracking
- Languages extraction from 3 sources: dedicated section, personal chunk, skills chunk
- Experience prompt extracts embedded projects (Project: X blocks inside company sections)

### Changed
- Chunked processor rewritten: 3-chunk grouping → N per-section parallel calls
- Experience token limits increased (4000-12000) with /2 divisor for longer resumes
- Section splitter handles 3-word headers (Professional Work Experience), singular forms, common typos
- Preamble threshold lowered 50→15 chars (short name+title headers no longer skipped)
- Progress bar now shows actual chunk count instead of hardcoded 3

### Fixed
- Pydantic validation crash: LLM returning bare null instead of ConfidenceField dict
- Python list repr strings in descriptions (`"['a', 'b']"` → joined text via ast.literal_eval)
- Experience entries without company name no longer skipped (set null or "Consulting")
- LLM misclassifying dated entries as projects instead of experience
- Empty language entries blocking downstream extraction (null name filtered)
- Missing section headers: education qualification, professional work experience, project summary
- Languages typo regex (Launguage, Langauges) without false-matching bare "Languages" in skills tables

## [0.8.0] - 2026-03-09

### Added
- Parse from S3: select user with existing resume → parse via /parse-s3 with save_to_db
- GET /search/users-with-resume endpoint (joins users→profiles→resumes, returns S3 key)
- search_users_with_resume() DB function
- Two-section parse panel: "Parse from S3" (primary) + OR divider + "Upload Resume"
- Buttons disabled until file/user selected

### Changed
- Renamed header to "Radient AI Engine Prototype"
- createSearchSelect() now passes full item to onChange callback

### Fixed
- Removed session_id from /chat API docs (handled internally)
- Search dropdown constrained to parent width (was overflowing)

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
