# AI Migration — Old vs New (Models & Endpoints Status)

> Companion to [`resume-parser-pipeline.md`](./resume-parser-pipeline.md) (PRD) and
> [`resume-parser-implementation-plan.md`](./resume-parser-implementation-plan.md) (plan).
> Purpose: at-a-glance "what is changing" + "what actually responds right now".
>
> **Reading guide:** "New" = the target `ai-prototype-service` (single Fargate Python service).
> That service **does not exist yet** — so every NEW endpoint below is **not live**.

---

## 1. Model Changes (Old → New)

| Feature | Old (current) | New (per PRD) | Models ready? |
|---------|---------------|---------------|---------------|
| Resume Parsing | Mistral 14B (SageMaker) / HF-router LLM fallback | **LayoutLMv3 + BERT-NER** | ❌ Not deployed |
| Job Recommendations | Mistral 14B prompt | **Sentence Transformers** (all-MiniLM-L6-v2), cosine similarity | ❌ Not deployed |
| Skill Extraction | Mistral 14B prompt | **JobBERT** | ❌ Not deployed |
| Document Extraction | inline pdf-parse / mammoth (text only) | **DocumentExtractor** (pypdfium2 + doctr OCR + bbox) | ❌ Not deployed |
| Chatbot | DialoGPT | **REMOVED** from roadmap | — dropped |
| JD Generation | T5 / BART | **REMOVED** | — dropped |
| Quality Scoring | BERT classifier | **REMOVED** | — dropped |
| Salary Prediction | — | **REMOVED** | — dropped |

**Scope: 7 features → 3 core** (+ DocumentExtractor as shared base module).
**Cost: ~$1,000/mo always-on → ~$15–18/mo** (Fargate + nightly shutdown).

---

## 2. Endpoint Readiness (New `ai-prototype-service`)

| Endpoint | Feature | Will it respond now? | Why |
|----------|---------|----------------------|-----|
| `POST /resume-parser/parse` | Resume Parsing | ❌ No | Service not built |
| `POST /job-match/recommend` | Job Recommendations | ❌ No | Service not built |
| `POST /skills/extract` | Skill Extraction | ❌ No | Service not built |
| `POST /extract` | Document Extraction | ❌ No | Service not built |
| `GET /healthz` | Health (models loaded) | ❌ No | Service not built |
| `GET /` | HTML demo upload UI | ❌ No | Service not built |

> **None of the new endpoints respond.** They belong to the Python service that is
> Phase 1 of the plan and currently at 0%.

---

## 3. What Responds TODAY (Legacy / current external AI service)

Hosted on the dev ALB (`AI_MODEL_URL`), consumed by this repo:

| Endpoint (current) | Feature | Mode | Status |
|--------------------|---------|------|--------|
| `POST /ai/parse` | Resume Parsing | async → returns `job_id` | ✅ Live (if dev AI up) |
| `GET /ai/parse-status/{job_id}` | Resume Parsing | poll until `done` | ✅ Live |
| `POST /ai/recommend` | Job Recommendations | sync | ✅ Live |
| Skill extraction | — | done in-repo (keyword + LLM), no dedicated endpoint | ✅ Live (local) |

**Contract difference to note:** current resume parse is **async (submit + poll)**;
the new `/resume-parser/parse` is meant to be **synchronous**. This is a contract change,
not just a path rename.

---

## 4. This-Repo Connection Status (consumer side)

| Consumer | Calls | Path today | Switch to new | Done in repo? |
|----------|-------|-----------|---------------|---------------|
| user-service (resume) | resume parse | `/parse` (+`/parse-status`) | `/resume-parser/parse` via env `AI_PARSE_PATH` | 🟡 env-configurable, default kept |
| recommendation-service | job recs | `/recommend` | `/job-match/recommend` via env `AI_RECOMMEND_PATH` | 🟡 env-configurable, default kept |
| api-gateway | proxy | `/api/v1/ai/*` passthrough | works if new service mounts under `/ai` | ✅ generic passthrough |
| skill / extract consumers | — | none | optional new consumers | ⬜ not started (demo-only for now) |

`AI_ENABLED` flag added to recommendation + user (resume) domains: when `false`, AI is
skipped and safe fallbacks return (SQL recs / pattern-based parsing). Runtime-verified
on the recommendation path (HTTP 201, no AI call, no 5xx).

---

## 5. Summary

- **Models (LayoutLMv3, BERT-NER, Sentence Transformers, JobBERT): NOT ready** — not deployed anywhere.
- **All NEW endpoints: NOT responding** — the Python service is unbuilt (Phase 1, 0%).
- **Only the current/legacy AI endpoints respond** (`/ai/parse`, `/ai/parse-status`, `/ai/recommend`) — and only if the dev AI service is up.
- **This repo is ready to connect** the moment the new service exists: paths are env-switchable, gateway passthrough is generic, response mapping + schema are preserved, `AI_ENABLED` flag is in place.

**Blocking next step:** build the standalone `ai-prototype-service` (the models + the 6 endpoints). Until then, nothing on the new paths will answer.
