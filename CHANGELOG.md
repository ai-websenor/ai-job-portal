# Changelog

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

## [0.2.0] - 2025-12-15

### Added
- Resume parsing with Mistral 7B on SageMaker
- Job-contextual chatbot
- LLM-ranked job recommendations
- S3 upload/download integration
- Testing UI with tabs for parse, chat, recommend
- OpenAPI 3.0 spec
- GitHub Actions CI/CD, ECS Fargate deployment

## [0.1.0] - 2025-11-01

### Added
- Initial resume parser prototype
- PDF and DOCX text extraction
- Basic structured JSON output
