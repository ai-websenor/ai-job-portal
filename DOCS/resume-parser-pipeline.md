Parent

PRD: AI Service Replacement — Small-Model Prototype

Problem Statement

The platform's AI capability currently runs Mistral 14B on AWS SageMaker (ml.g5.2xlarge), generating a fixed ~$1,000/month operating cost while serving 7 originally-planned AI features. Client (Radiants) has issued a directive to:

Eliminate the always-on $1,000/month SageMaker spend
Replace single-LLM architecture with self-hosted, per-feature small models per the original pre-project AI cost analysis
Reduce platform AI scope from 7 features to 3 core features (Resume Parsing, Job Recommendations, Skill Extraction)
Validate quality of the new approach against current Mistral output before committing to production rollout
Without action, the platform either continues bleeding ~$1k/month on infrastructure the client refuses to pay for, or loses AI capability entirely if SageMaker is torn down without a replacement in flight.

Solution
Build a single Fargate-hosted Python service (ai-prototype-service) that exposes three task-specific small-model pipelines through HTTP endpoints, plus a minimal HTML upload page for client demonstration. Deploy to dev environment only during prototype phase. Cost target: ~$15–18/month with the nightly-shutdown automation (PRD B) applied.

The service replaces the prompt-engineering-heavy Mistral pipeline with deterministic ML pipelines:

Resume Parsing — LayoutLMv3 (vision-aware) + BERT-NER for structured field extraction
Job Recommendations — Sentence Transformers for embedding-based candidate-job similarity
Skill Extraction — JobBERT for skill identification from resume / job-description text
Client receives a demo-ready URL by 9-May-2026 with side-by-side comparison output and a 1-page summary recommending go/no-go.

User Stories
As a job seeker, I want my uploaded resume parsed into structured fields, so that I don't have to manually type my profile information
As a job seeker, I want the platform to handle resumes with non-standard layouts (multi-column, designer formats, scanned PDFs), so that I can use any resume format without rejection
As a job seeker, I want job recommendations that match my actual skills and experience, so that I see relevant openings rather than generic listings
As a job seeker, I want my skills automatically identified from my resume, so that recruiters can find me through skill-based search without me listing every keyword manually
As an employer, I want skill extraction on candidate resumes, so that I can filter applicants by required competencies without reading every CV manually
As an employer, I want my job posting matched to relevant candidates, so that I receive a curated applicant pool rather than spam applications
As a platform owner, I want AI service cost to be predictable and bounded, so that I can budget infrastructure without surprise bills
As a platform owner, I want AI service infrastructure to scale to zero overnight, so that we don't pay for idle compute outside business hours
As a Websenor developer, I want a single deployable container hosting all 3 AI pipelines, so that I can iterate, deploy, and debug in one place during the prototype phase
As a Websenor developer, I want the AI prototype to use the same Pydantic schema as the previous Mistral pipeline, so that downstream services don't change their integration code when we switch
As a Websenor developer, I want each model loaded once at container startup, so that per-request inference is fast and free of model-load latency
As a Websenor developer, I want a feature flag (AI_ENABLED) on consumer services, so that AI calls can be skipped cleanly when the prototype is offline
As a client product owner, I want a demo URL to upload sample resumes and view extracted output, so that I can evaluate prototype quality firsthand before approving production rollout
As a client product owner, I want a side-by-side view of input PDF and extracted JSON, so that I can verify accuracy without context-switching
As a client product owner, I want a 1-page summary covering cost projection and quality observations, so that I can take a clear go/no-go decision to my management team
As a client management team member, I want concrete cost numbers from real infrastructure usage, so that I can compare prototype costs against current SageMaker spend
As a Websenor PM, I want a written record of prototype outputs on sample resumes, so that there is no ambiguity about what was demonstrated when the client makes their decision
As a Websenor DevOps engineer, I want the prototype service registered in Cloud Map under the dev environment, so that future internal integration with user-service and application-service is straightforward
As a Websenor DevOps engineer, I want the prototype service to share the existing dev ALB, so that I do not provision additional load-balancer cost
As a Websenor DevOps engineer, I want the prototype Docker image to use a multi-stage build with torch-cpu, so that the image size stays under 3GB and ECS task starts in reasonable time
As a Websenor QA engineer, I want a /healthz endpoint that only returns 200 after all models have loaded into memory, so that ECS does not route traffic to a half-initialized container
As a Websenor QA engineer, I want representative sample resumes spanning different layouts (multi-column, sidebar, designer, scanned, multilingual, short, long), so that quality observations capture realistic edge cases not just happy paths
Implementation Decisions
Service Architecture

Single Fargate task 0.5 vCPU + 4GB RAM running FastAPI, hosting all 3 pipelines in one Python process to amortize PyTorch + transformers base memory across pipelines
Endpoints: GET / (HTML upload UI), POST /resume-parser/parse, POST /job-match/recommend, POST /skills/extract, GET /healthz
Single port (3000) routed via dev ALB with path-based routing or subdomain (decided during deployment)
Cloud Map registration: ai-prototype-service.ai-job-portal-dev.local:3000
Modules

DocumentExtractor — encapsulates PDF/DOCX text + bounding-box extraction with ligature unwrapping; falls back to OCR (doctr) when text extraction returns insufficient content (scanned-PDF detection). Reusable by all 3 pipelines and any future feature needing document parsing.
ResumeParserPipeline — orchestrates LayoutLMv3 segmentation + BERT-NER extraction + Pydantic assembly into the same ResumeOutput schema used by the previous Mistral pipeline. Single method: parse(extracted_doc) -> ResumeOutput.
JobMatcher — Sentence Transformers encoding (all-MiniLM-L6-v2 or similar small bi-encoder) and cosine-similarity ranking. Stateless: recommend(candidate_profile, job_corpus, top_k) -> List[JobMatch].
SkillExtractor — JobBERT inference and post-processing (deduplication, confidence threshold). Single-method interface.
ModelRegistry — singleton, lazy-loading, thread-safe model store. Hides PyTorch / transformers initialization complexity. Pipelines call ModelRegistry.get(name) rather than loading models directly.
HTTP routes (FastAPI) and Jinja templates are intentionally thin — they adapt HTTP into pipeline calls and render results without business logic.
Schema

ResumeOutput Pydantic model is preserved unchanged from the existing prototype to maintain integration compatibility — fields for personal details, experience, education, skills, certifications. New service must produce instances of this exact schema so consumer services need zero integration change when switched on.
New schemas introduced: JobMatch (job_id, score, reason), Skill (name, confidence, source_section), ExtractedDocument (pages, text, bboxes, mime_type, page_count).
Deployment

ECR repo: ai-job-portal/ai-prototype-service (dev only initially)
ECS service registered in dev cluster ai-job-portal-dev with desired-count=1
ALB listener rule added to existing dev ALB; no new ALB provisioned
New service added to nightly-shutdown automation (PRD B) from Day 1
Out-of-platform features

Chatbot, JD Generation, Quality Scoring, and Salary Prediction are removed from the platform AI roadmap entirely under this directive. Cleanup of references in copy / SOW notes / existing settings is a separate housekeeping task.
Consumer-side AI flag

All existing services that currently call SageMaker introduce env var AI_ENABLED. When false, AI calls are skipped and code paths return safe defaults (empty arrays, null fields). This change rolls out before SageMaker tear-down to prevent 5xx cascade.
Testing Decisions
A good test in this codebase verifies external behavior — given a known input, the public interface returns the expected output shape and (where possible) value — without coupling to internal implementation choices like which transformer class is used or how tokenization is performed.


DocumentExtractor — unit tests using sample PDF/DOCX bytes from the existing prototype folder. Assert: page count, non-empty text on selectable-text PDFs, bbox coordinates within page dimensions, OCR fallback engaged when text extraction yields below threshold.

ResumeParserPipeline — snapshot tests. Sample PDFs run through pipeline; output JSON committed to repo as expected/<sample>.json. Test asserts structural equality with the snapshot. Snapshots are regenerated intentionally when pipeline changes.

JobMatcher — unit tests with synthetic vectors. Assert: top-K returned in similarity-descending order; identical candidate-job vectors return similarity = 1.0; orthogonal vectors return ~0.0.

SkillExtractor — unit tests against curated text snippets known to contain specific skills (eg. "5 years of Python and Django experience" → {Python, Django} extracted). Assert membership and minimum confidence.

E2E smoke test — uploads one sample PDF to the running FastAPI service via TestClient; asserts status 200, JSON shape matches ResumeOutput, response under 10 seconds.
Tests intentionally NOT written:

ModelRegistry — caching boilerplate; covered transitively
HTTP route handlers — thin glue; covered by E2E smoke
HTML templates — visual rendering; manual verification
Prior art: existing apps/Resume-parser-prototype/tests/ (or similar) — reuse pytest patterns and conftest fixtures for sample-resume bytes.

Out of Scope
LayoutLMv3 fine-tuning on a labelled resume corpus (planned upgrade after client approval; prototype uses base model + careful prompt-equivalent input)
Production-grade per-feature service split (Resume / Job-Match / Skill as independent services) — prototype intentionally bundles into one container; split happens post-approval
Stage environment deployment — prototype is dev-only
Chatbot, JD Generation, Quality Scoring, Salary Prediction — dropped from platform scope
Streaming response support — all endpoints return fully-formed JSON synchronously
Model output explainability / confidence breakdowns beyond top-level score
Batch processing API — single-request only
Authentication / authorization on the demo URL — protected by Fargate security group + ALB rules in dev environment
Further Notes
Deadline: demo-ready 9-May-2026. Two weeks from kickoff Mon 27-Apr-2026.
Client touchpoint: Sunny Suchdev (Websenor PM) handles all client correspondence; this PRD is internal execution scope only.
Cost target validation: Fargate metrics from prototype period feed directly into the 1-page summary doc presented to client management.
Fallback if quality is insufficient: LoRA fine-tune on 50 manually-labelled resumes is the planned next step, ~1 day of work post-prototype review.
Hard problem flagged: LayoutLMv3 has no out-of-the-box resume-finetuned variant on HuggingFace. Base model + bbox-aware input is the prototype baseline. If quality results are weak, fine-tuning becomes mandatory before production rollout.
Decision document: see docs/decisions/2026-04-25-ai-strategy-pivot.md for context, alternatives considered, and consolidated decision record covering both this PRD and PRD B.
Related PRD: Nightly AWS Cost-Control Automation (separate issue) provides the shutdown infrastructure that brings the running cost of this service down to ~$15–18/mo.


Resume Parser pipeline + /resume-parser/parse endpoint + snapshot tests

**What to build**

The Resume Parsing pipeline composing LayoutLMv3 (vision-aware section segmentation) + BERT-NER (entity extraction) + Pydantic assembly into the existing ResumeOutput schema. Exposed via POST /resume-parser/parse. Snapshot tests pin behavior against curated sample resumes.

End-to-end behavior: upload a resume PDF to /resume-parser/parse, receive JSON conforming to the ResumeOutput schema (same shape as the previous Mistral pipeline produced).

Acceptance criteria

ResumeParserPipeline class in app/pipelines/resume_parser.py with method parse(extracted_doc: ExtractedDocument) -> ResumeOutput

LayoutLMv3 model loaded via ModelRegistry (lazy, singleton, thread-safe)

BERT-NER model loaded via ModelRegistry

ResumeOutput Pydantic model ported unchanged from apps/Resume-parser-prototype/app/models/resume.py

POST /resume-parser/parse endpoint accepts multipart PDF/DOCX upload, calls DocumentExtractor then ResumeParserPipeline, returns ResumeOutput JSON

Snapshot tests: 3–5 sample PDFs run through pipeline, output committed to tests/snapshots/<sample>.json, test diffs structural equality against snapshot

Snapshot regeneration documented in test README (intentional vs unintentional diff workflow)

/healthz only returns 200 after both LayoutLMv3 and BERT-NER are loaded into memory

Cold-start time logged at INFO level on startup


**DocumentExtractor module + POST /extract endpoint #242**

Parent
#236

What to build
A DocumentExtractor module that takes raw file bytes (PDF or DOCX) and returns an ExtractedDocument with per-page text, per-token bounding boxes, ligature unwrapping, and OCR fallback for scanned PDFs. Exposed via POST /extract on the prototype service so the extraction can be tested end-to-end before any AI pipelines are built on top.

End-to-end behavior: upload a PDF/DOCX via curl to /extract, receive JSON with pages, text, and bbox arrays.

Acceptance criteria

DocumentExtractor class in app/extractors/ with method extract(file_bytes: bytes, mime_type: str) -> ExtractedDocument

PDF path uses pypdfium2; reuses ligature-unwrapping logic from apps/Resume-parser-prototype/app/extractors/pdf.py

DOCX path supported via python-docx or equivalent

Bounding boxes returned at word-token level (aggregated from char-level rects)

OCR fallback engaged when extracted text length is below configurable threshold (scanned-PDF detection); uses doctr or equivalent

POST /extract endpoint accepts multipart file upload, returns ExtractedDocument JSON

ExtractedDocument Pydantic model defined: pages: List[PageContent], total_pages: int, mime_type: str, where PageContent carries text and bboxes

Unit tests using sample PDF/DOCX bytes from existing prototype folder; assert page count, non-empty text, bbox coordinates within page dimensions

One test triggers OCR fallback path on a scanned-PDF sample

