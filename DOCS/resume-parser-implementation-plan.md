# AI Service Replacement — Implementation Plan

> Companion execution plan for [`resume-parser-pipeline.md`](./resume-parser-pipeline.md).
> Scope: replace the always-on external LLM (Mistral/SageMaker) with the self-hosted
> small-model `ai-prototype-service`, and wire this monorepo (`ai-job-portal`) to consume it.
>
> **Constraint:** Frontend (`apps/job-board-web`) is **out of scope** — no frontend edits.
> All work follows existing project patterns: NestJS service/module/controller/DTO layout,
> gateway proxy routing, Drizzle persistence, `StructuredResumeDataDto` response shape,
> and the existing `/ai/*` passthrough contract.

---

## What the PRD Directs You To Do (Build Order)

The PRD is primarily a **build order for a brand-new Python microservice** — only one item
(F) lands in this NestJS repo. Mapping each directive to its owner and status:

| # | PRD directive | Owner | Status |
|---|---------------|-------|--------|
| A | Build FastAPI service shell (0.5 vCPU / 4GB, all pipelines one process) + 6 endpoints (`/`, `/resume-parser/parse`, `/job-match/recommend`, `/skills/extract`, `/extract`, `/healthz`); `/healthz` 200 only after models load; log cold-start | **New AI service** (external) | ⬜ 0% |
| B | Build 5 modules: DocumentExtractor (PDF/DOCX + bbox + ligature + doctr OCR), ResumeParserPipeline (LayoutLMv3 + BERT-NER), JobMatcher (Sentence Transformers), SkillExtractor (JobBERT), ModelRegistry (lazy singleton) | **New AI service** | ⬜ 0% |
| C | Keep `ResumeOutput` schema unchanged (port from old prototype); add `JobMatch`, `Skill`, `ExtractedDocument` | **New AI service** + this repo (mapping preserved) | 🟡 contract known |
| D | Tests: extractor units, resume snapshot tests (3–5 PDFs), matcher units, skill units, E2E smoke (<10s); collect varied sample resumes | **New AI service** | ⬜ 0% |
| E | Deploy dev: ECR repo, ECS service (count=1), ALB listener rule (reuse dev ALB), Cloud Map reg, multi-stage Docker (torch-cpu, <3GB), nightly-shutdown | **DevOps / infra** | ⛔ 10% |
| F | Add `AI_ENABLED` flag to AI-consuming services; safe defaults when off; roll out before old-service teardown | **This repo** | ✅ done |
| G | Deliver demo URL (side-by-side PDF vs JSON) + 1-page go/no-go summary (cost + quality vs Mistral) | **New AI service + PM** | ⬜ 0% |

**Takeaway:** A, B, D, G = build the new Python service & demo it (the bulk of the work, not in
this repo). E = dev infra. **F is the only repo-side obligation, and it is complete.**

### PRD-flagged risks
- No off-the-shelf resume-finetuned LayoutLMv3 on HuggingFace → base model is the baseline.
  If quality is weak, LoRA fine-tune on ~50 labelled resumes becomes mandatory (~1 day).
- Prior-art folder `apps/Resume-parser-prototype/` (source for the `ResumeOutput` port) is
  **missing from this repo** — recover from git history or rebuild from the live contract.

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Completed |
| 🟡 | Partially done (needs change/rework) |
| ⬜ | Not started |
| ⛔ | Blocked / depends on external deliverable |

**Overall completion: ~30%**

The connection/plumbing layer and schema contract largely exist. The bulk of remaining
work is the standalone AI service (separate deliverable) plus consumer-side contract fixes.

---

## Phase 0 — Decisions & Prerequisites  `🟡 40%`

Lock the choices that change downstream scope before building.

| Item | Status | Notes |
|------|--------|-------|
| Confirm where the AI service lives (new repo vs `apps/` in this monorepo) | ⬜ | Drives polyglot tooling decision |
| Decide AI route mounting: under `/ai/*` (no gateway change) vs literal doc paths | ⬜ | Recommend `/ai/*` to reuse existing passthrough |
| Decide resume contract: synchronous JSON (per doc) vs keep async job+poll | ⬜ | Doc says synchronous |
| Confirm skill extraction scope: in-platform consumer vs demo-only | ⬜ | Drives Phase 6 inclusion |
| Recover original `ResumeOutput` source (prototype folder is missing) | ⬜ | Check git history / live service output |
| AI service hosting/env wiring confirmed (dev ALB shared, listener rule) | ✅ | `AI_MODEL_URL` already points to dev ALB |

**Exit:** all decisions signed off by PM/architect.

---

## Phase 1 — Standalone AI Service (`ai-prototype-service`)  `⛔ 0%`

The core deliverable. **Does not exist in this repo** — separate build.
Not a NestJS service; this monorepo only consumes it. Listed for completeness/tracking.

| Item | Status |
|------|--------|
| Service scaffold (FastAPI app, single process, all pipelines) | ⬜ |
| `DocumentExtractor` (PDF/DOCX text + bbox, ligature unwrap, OCR fallback) | ⬜ |
| `ResumeParserPipeline` (layout segmentation + NER + assembly) | ⬜ |
| `JobMatcher` (embedding similarity ranking) | ⬜ |
| `SkillExtractor` (skill identification + dedup/threshold) | ⬜ |
| `ModelRegistry` (lazy, singleton, thread-safe loader) | ⬜ |
| Pydantic models (`ResumeOutput` preserved; `JobMatch`, `Skill`, `ExtractedDocument` new) | ⬜ |
| HTTP routes + minimal HTML upload UI | ⬜ |
| `/healthz` returns 200 only after all models loaded | ⬜ |
| Multi-stage container build (cpu-only, size-bounded) | ⬜ |

**Exit:** service answers all required endpoints in dev, health-gated.

> **Note:** This phase is the largest single lift and is external to this repo.
> The remaining phases below are the work that lands inside `ai-job-portal`.

---

## Phase 2 — Schema & Response Contract  `🟡 70%`

Guarantee consumer services need zero shape change when switched on.

| Item | Status | Notes |
|------|--------|-------|
| `ResumeOutput` shape known | 🟡 | Recoverable from existing AI-response mapping interface |
| Consumer mapping to `StructuredResumeDataDto` exists | ✅ | Already implemented and battle-tested |
| Recommendation response shape (`job_id`, `score`, `reason`) matches consumer | ✅ | No change needed |
| New `Skill` / `ExtractedDocument` shapes defined for consumers (if consumed) | ⬜ | Only if Phase 6 in scope |

**Exit:** contract documented; mapping confirmed unchanged.

---

## Phase 3 — Resume Consumer Rework (async → sync + path)  `🟡 70%`

Update the resume parsing client in the user domain to the new contract.

| Item | Status | Notes |
|------|--------|-------|
| Existing custom-model client present | ✅ | Currently submit + poll |
| Endpoint paths made env-configurable (non-breaking) | ✅ | `AI_PARSE_PATH` / `AI_PARSE_STATUS_PATH`, default to current |
| Switch to synchronous single-call contract | ⬜ | Remove polling loop once AI service ships sync |
| Preserve response→`StructuredResumeDataDto` mapping | ✅ | Reuse as-is |
| Preserve existing local fallback chain (text parse + keyword) | ✅ | Keep as safety net during prototype |

**Exit:** resume upload flow returns structured data via new endpoint, fallback intact.

---

## Phase 4 — Recommendation Consumer Path Update  `✅ 95%`

Smallest change set — path rename, shapes already align.

| Item | Status | Notes |
|------|--------|-------|
| Recommendation client + DB persistence present | ✅ | Stored-then-serve pattern works |
| Endpoint path made env-configurable | ✅ | `AI_RECOMMEND_PATH`, default `/recommend` |
| Flip env to new `/job-match/recommend` when AI service ships | ⬜ | Config-only switch, no code change |
| Response parsing unchanged | ✅ | Already reads expected fields |
| DB caching / refresh-on-profile-change flow unchanged | ✅ | |

**Exit:** recommendations fetched from new endpoint, stored, served.

---

## Phase 5 — `AI_ENABLED` Feature Flag (graceful degradation)  `✅ 95%`

New cross-cutting flag so AI calls skip cleanly when service offline.
Must ship **before** old service teardown to avoid error cascade.

| Item | Status | Notes |
|------|--------|-------|
| Introduce `AI_ENABLED` env across AI-consuming services | ✅ | recommendation + user (resume) domains |
| Skip AI calls + return safe defaults when disabled | ✅ | recs→SQL fallback; resume→pattern fallback |
| Add to all env example files | ✅ | `.env.dev.example`, `.env.services.example` |
| Verify no 5xx when disabled | ✅ | Runtime smoke: reco `refresh` w/ flag off → HTTP 201, guard fired, no AI call. Resume path = same pattern, build-verified |

**Exit:** toggling flag off degrades gracefully with no errors.

---

## Phase 6 — Skill Extraction & Document Extract Consumers (conditional)  `⬜ 0%`

Only if skill/extract are consumed in-platform (not demo-only). Otherwise covered
by the generic gateway passthrough with no consumer code.

| Item | Status | Notes |
|------|--------|-------|
| Decide in-platform vs demo-only (Phase 0) | ⬜ | Gate for this phase |
| Add skill-extraction consumer in relevant domain | ⬜ | Follow existing service/DTO pattern |
| Add document-extract consumer if needed | ⬜ | |
| Map results into existing skill/profile structures | ⬜ | Reuse existing skill entities |

**Exit:** skills populated via new endpoint, or phase formally skipped.

---

## Phase 7 — Gateway & Environment Alignment  `🟡 85%`

Routing and env consistency across gateway + internal consumers.

| Item | Status | Notes |
|------|--------|-------|
| Generic `/ai/*` gateway passthrough | ✅ | Already proxies any downstream path, multipart-aware |
| Confirm new endpoints reachable via passthrough | 🟡 | Works if service mounts under `/ai` |
| Unify env var naming (gateway vs consumer keys point to same target) | ⬜ | Two keys exist today (`AI_SERVICE_URL` vs `AI_MODEL_URL`) |
| Update env example files for any new/renamed vars | ✅ | Added `AI_ENABLED` + path vars |

**Exit:** single consistent AI base config; all routes reachable.

---

## Phase 8 — Infrastructure & Deployment (dev only)  `⛔ 10%`

Provision dev hosting for the AI service. Follows existing ECS/ALB infra pattern.

| Item | Status | Notes |
|------|--------|-------|
| Existing dev ALB available | ✅ | Reused, no new LB |
| Container registry repo for AI service | ⬜ | |
| Dev cluster service definition (desired-count 1) | ⬜ | Mirror existing task-def pattern |
| ALB listener rule for AI service | ⬜ | |
| Service discovery registration (dev namespace) | ⬜ | |
| Add to nightly-shutdown automation | ⬜ | Depends on separate cost-control PRD (PRD B) |

**Exit:** AI service running in dev, reachable, cost-bounded.

---

## Phase 9 — Testing  `⬜ 5%`

Behavior-level tests following existing project testing conventions.

| Item | Status | Notes |
|------|--------|-------|
| Existing E2E harness/patterns available | ✅ | Reuse current spec-style setup |
| AI-service unit/snapshot tests (extractor, pipelines) | ⬜ | Lives with AI service (Phase 1) |
| Sample resume fixtures (multi-column, scanned, multilingual, etc.) | ⬜ | None present; must collect |
| Consumer integration tests (flag on/off, path, mapping) | ⬜ | In this repo |
| E2E smoke (upload → structured output, latency bound) | ⬜ | |

**Exit:** green tests for consumer flows + AI-service pipelines.

---

## Phase 10 — Demo, Validation & Cleanup  `⬜ 0%`

Client-facing prototype validation and roadmap housekeeping.

| Item | Status | Notes |
|------|--------|-------|
| Demo URL with upload + side-by-side output | ⬜ | Part of AI service |
| Quality comparison vs previous output (written record) | ⬜ | |
| 1-page cost + quality summary for go/no-go | ⬜ | Real dev-infra metrics |
| Remove dropped-feature references (chatbot, JD gen, quality scoring, salary) | ⬜ | Separate housekeeping task |
| Old LLM/SageMaker teardown (after flag rollout) | ⬜ | Only after Phase 5 live |

**Exit:** client has demo + summary; legacy spend removed.

---

## Rollup

| Phase | Title | Status | % |
|-------|-------|--------|---|
| 0 | Decisions & Prerequisites | 🟡 | 40% |
| 1 | Standalone AI Service | ⛔ | 0% |
| 2 | Schema & Response Contract | 🟡 | 70% |
| 3 | Resume Consumer Rework | 🟡 | 70% |
| 4 | Recommendation Consumer Path | ✅ | 95% |
| 5 | `AI_ENABLED` Flag | 🟡 | 90% |
| 6 | Skill/Extract Consumers (conditional) | ⬜ | 0% |
| 7 | Gateway & Env Alignment | 🟡 | 85% |
| 8 | Infrastructure & Deployment | ⛔ | 10% |
| 9 | Testing | ⬜ | 5% |
| 10 | Demo, Validation & Cleanup | ⬜ | 0% |

**Overall: ~30%**

> Connection plumbing, schema mapping, and recommendation flow are the most complete.
> Critical path is **Phase 1 (AI service)** — everything client-facing blocks on it.
> The highest-value low-effort items inside this repo are **Phases 4, 3, 5**.

---

## Critical Path & Sequencing

1. **Phase 0** decisions (unblocks everything)
2. **Phase 1** AI service build (longest; external) — parallelizable with 3/4/5
3. **Phases 3 + 4 + 5** consumer reworks (this repo; can proceed against contract)
4. **Phase 7** env/gateway alignment
5. **Phase 8** dev deploy
6. **Phase 9** testing
7. **Phase 5 rollout → legacy teardown → Phase 10** demo & cleanup

## Out of Scope

- Frontend (`apps/job-board-web`) — no edits.
- Model fine-tuning (post-approval fallback).
- Per-feature service split (prototype bundles into one container).
- Staging/production deployment (dev-only prototype).
- Dropped features: chatbot, JD generation, quality scoring, salary prediction.
