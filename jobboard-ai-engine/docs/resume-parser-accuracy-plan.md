# Resume Parser Accuracy — Implementation Plan

**Goal:** 100% extraction coverage and 90%+ field accuracy on well-formatted, standard resume layouts (PDF + DOCX). Poorly structured resumes are out of scope for this phase.

**Baseline (2026-07-16):** Overall test result **Fail** — 25 bugs across 20 test resumes
(`docs/Resume AI Parsing Test Report.docx`, `docs/JobBoard Ai Module Parsing Of Resume .xlsx`).

**Current pipeline:** pypdfium2 / python-docx text extraction → single "whole" prompt →
Qwen2.5-3B-Instruct (vLLM on g4dn.xlarge, 12k context) → JSON parse + merge in
`app/parser/chunked_processor.py`. Fallback: raw chunked mode when text > 12k chars or whole call fails.

---

## Root Causes (validated against test resumes)

| # | Root cause | Evidence | Bugs covered |
|---|-----------|----------|--------------|
| RC1 | **Schema gaps** — `PersonalDetails` has no `email` field; no DOB / nationality / marital status / address / hobbies / declaration; projects lack role / duration / team size | `app/models/resume.py:5` — email absent from model AND all prompts. JGobhi email `gobhi28396@gmail.com` present in extracted text but dropped | Report #4, #8; xlsx #10, #15, #16 |
| RC2 | **3B model hallucination** — invents companies, dates, certifications, URLs | Abhishek docx contains no "Wipro", no LinkedIn URL, no per-company dates — all fabricated by the model | xlsx #2–#9 (Abhishek), #1–#7 (Abhinandan), #12 |
| RC3 | **No deterministic extraction / validation layer** — emails, phones, URLs trusted to LLM; no post-check of LLM output against source text | LinkedIn duplicated into website (one `if` fix); Chennai → Tamil Nadu (static lookup) | Report #2, #7; xlsx #13 |
| RC4 | **Prompt defects** — whole-mode prompt missing "graduation year → endDate" rule; skills prompt instructs proficiency *inference*; "extract headline aggressively" invites fabrication | JGobhi `startDate: 2016-01-01` generated from "passed out in the year - 2016" | Report #1; xlsx #4 (Abhishek), #5 (Abhinandan), #17 |
| RC5 | **Extractor gaps** — PDF link annotations (embedded hyperlinks) never read | Report bug: LinkedIn behind hyperlink text lost while visible GitHub text extracted | Report #5 |

**Decisions locked (2026-07-16):**
1. Email + extended personal-details fields go into the schema — onboarding form accepts them. ✅
2. `proficiencyLevel` / `employmentType`: **leave empty** when resume is silent — no more `intermediate` / `full_time` fillers. ✅
3. Phase 4 (model upgrade): **do not implement until explicit "go"**. No extra server cost (same g4dn.xlarge; AWQ 4-bit 7B ≈ 5–6 GB fits T4 16 GB). ✅

---

## ⚠️ API Compatibility Constraint (hard rule for every phase)

The frontend and main project already consume this JSON and extract keys by name.
**The output structure must not break.** Concretely:

- **Additive only.** New fields may be added; existing keys are NEVER renamed, removed, nested differently, or type-changed.
- All existing keys keep their current type: strings stay strings (`""` when empty), dates stay `string | null`, booleans stay booleans, arrays stay arrays (`[]` when empty). No key ever disappears from the payload.
- New fields default to `""` / `[]` so older consumers that ignore unknown keys are unaffected.
- **One value-level change (decision #2):** `proficiencyLevel` and `employmentType` may now arrive as `""` instead of always `"intermediate"` / `"full_time"`. Type is unchanged (still string), but frontend dropdowns must tolerate empty value → verify with the main-site team before Phase 1.6 ships. If the form requires a value, apply the default at the form layer, not in parser output.
- Eval harness (Phase 0) includes a schema-shape regression check: every parse result must validate against the published `ResumeOutput` schema with all legacy keys present.

---

## Phase 0 — Evaluation Harness (prerequisite for everything)

**Why first:** "90% accuracy" is unmeasurable without ground truth and a scorer. Every later phase must show a before/after number.

### Tasks

1. **Ground-truth dataset** — `tests/eval/ground_truth/<resume-stem>.json`
   - One JSON per test resume in `docs/test-docs/` (20 files), hand-filled in the exact
     `ResumeOutput` schema (post-Phase-1 schema, including `email`).
   - Rule: a field's ground-truth value is exactly what a careful human reads off the resume.
     Absent in resume → empty/null in ground truth (fabrication then scores as an error).
   - Start with the 6 bug-report resumes (Abhinandan, Abhishek, Gaurang, JGobhi, kasimbasha, SALEGANESH), then backfill the rest.

2. **Scorer** — `tests/eval/score.py`
   - Field-level comparison, per-category rules:
     - **Exact match:** email, phone, linkedin, github, dates, grade, gender
     - **Normalized exact:** names, company names, degree, institution (case/whitespace/punct-folded)
     - **Fuzzy (token-F1 or ratio ≥ 0.8):** descriptions, summaries, achievements
     - **Set match:** skills, languages (precision/recall over the set)
   - **Hallucination penalty:** value present in output but absent in ground truth counts as a *false positive* — tracked separately (this is the QA team's biggest complaint class).
   - Output: per-resume and aggregate — extraction coverage %, field accuracy %, hallucination count. Markdown + JSON report.

3. **Runner** — `tests/eval/run_eval.py`
   - Parses every resume in `docs/test-docs/` through the live pipeline
     (needs the vLLM endpoint up — reuse `infra/qwen_ec2_scheduler.py` start flow) OR replays saved raw LLM responses for offline scoring.
   - Caches raw LLM outputs per resume+prompt-hash so prompt-only changes re-score without re-calling the GPU.
   - Single command: `python -m tests.eval.run_eval --report eval-report.md`.

### Acceptance
- Baseline eval report committed showing current accuracy per field group.
- Re-running twice on cached outputs is deterministic.

**Est. effort:** 1.5–2 days (ground truth hand-labelling is the bulk).

---

## Phase 1 — Deterministic Layer (fixes ~8 bugs without touching the LLM)

### 1.1 Schema extension — `app/models/resume.py`

```python
class PersonalDetails(BaseModel):
    # existing...
    email: str = ""            # NEW — report #4, #8; xlsx #16
    dateOfBirth: str = ""      # NEW — xlsx #15 (YYYY-MM-DD or as stated)
    nationality: str = ""      # NEW
    maritalStatus: str = ""    # NEW
    address: str = ""          # NEW — full street address line
    hobbies: str = ""          # NEW — "; "-joined
    declaration: str = ""      # NEW

class ProjectDetail(BaseModel):
    # existing...
    role: str = ""             # NEW — xlsx #10
    duration: str = ""         # NEW — "Oct 2020 – Present" as stated
    teamSize: str = ""         # NEW
    responsibilities: str = "" # NEW — "; "-joined
```

- Add the same fields to `RAW_WHOLE_PROMPT`, `RAW_UNIFIED_PROMPT`, `PERSONAL_PROMPT`, `PROJECTS_PROMPT` (`app/parser/chunk_prompts.py`).
- Confirm the onboarding form API contract accepts the new keys (main-site coordination).

### 1.2 Regex-first contact extraction — new `app/parser/contact_extractor.py`

Deterministic extraction from **raw text** (before LLM), merged with LLM output where **regex wins on conflict**:

- `email`: RFC-lite regex; multiple hits → first = primary. Never lost again.
- `phone`: international + Indian formats (`+91-`, 10-digit, space/dash variants).
- `linkedin`: `linkedin\.com/(in|pub)/[\w-]+` → normalized `https://` form.
- `github`: `github\.com/[\w-]+`.
- `website`: remaining URLs that are not linkedin/github/mailto/naukri-tracking.
- Merge rule in `merge_page_results` / `merge_chunk_results`: regex value overrides LLM value for these five fields; LLM only fills when regex found nothing.

### 1.3 PDF hyperlink annotations — `app/extractors/pdf.py`

- Read link annotations per page via pypdfium2 raw API (`FPDFPage_GetAnnot*` / `FPDFAnnot_GetLink`) + `FPDFLink_CountWebLinks` on the textpage.
- Append to each page's text as a trailing block:
  ```
  [EMBEDDED LINKS]
  https://linkedin.com/in/xyz
  mailto:someone@mail.com
  ```
  → both the regex layer (1.2) and the LLM see them. Fixes report #5.
- DOCX equivalent: read `word/_rels/document.xml.rels` external targets (http/mailto), filter naukri tracking URLs, append the same block (`app/extractors/docx.py`).

### 1.4 Post-merge field hygiene — `app/parser/chunked_processor.py`

- `website` cleanup: if it contains `linkedin.com` / `github.com` / `@` (email), move value to the right field (if empty) and clear website. Fixes report #4, #7.
- Cross-section dedup: experience entry whose (title, description) fuzzy-matches a project entry → drop the duplicate from projects (or vice versa, keep the dated one). Fixes xlsx #7 (Abhinandan).

### 1.5 India city→state lookup — new `app/parser/geo.py`

- Static map of ~200 Indian cities → state (Chennai → Tamil Nadu, Bengaluru → Karnataka, Madurai → Tamil Nadu, …) + country inference ("India" when city matches and country empty).
- Applied post-merge only when `state` is empty. Fixes report #2, xlsx #13 (partially — Gaurang also needs model help).

### 1.6 Remove silent-default fillers (decision #2)

- `_coerce_flat_fields` (`chunked_processor.py:483`): delete `proficiencyLevel → "intermediate"` and `employmentType → "full_time"` defaults; leave `""`.
- Prompts: change defaults to "omit / empty string when not stated" and delete the inference ladder ("5+ years → expert"). Fixes xlsx #4 (Abhishek), #5 (Abhinandan).
- Model defaults in `SkillDetail.proficiencyLevel` / `ExperienceDetail.employmentType` → `""`.
- **Check:** main-site onboarding form must tolerate empty values (dropdowns with no pre-selection).

### Acceptance
- Eval re-run: email/phone/linkedin/github extraction = 100% on the 20-resume set; hallucination count for those fields = 0; state populated for all Indian-city resumes.

**Est. effort:** 2–2.5 days.

---

## Phase 2 — Prompt Hardening

All in `app/parser/chunk_prompts.py`. Prompt-only — re-scored via cached-output eval where possible, else one GPU eval run.

1. **Grounding preamble** (both whole + raw prompts):
   > Copy values verbatim from the text. If a value is not literally written, output "" / null / omit. Never infer, estimate, or invent dates, companies, certifications, proficiency, or years of experience.
2. **Graduation-year rule → whole prompt** (exists in section prompt only): single year with "passed out" / "graduated" / bare year → `endDate`, `startDate: null`. Fixes xlsx #17.
3. **Headline**: replace "extract aggressively" with the section-prompt rule — only a standalone title line under the name; else empty. Explicitly: *never take the first sentence of the summary*. Fixes report #1.
4. **Summary from bullets**: explicit instruction that a Summary/Profile section formatted as bullets IS the professionalSummary (join with "; "). Add a mini example. Fixes report #3, xlsx #11.
5. **Multi-education grades**: "extract `grade` for EVERY education entry, not only the first." Fixes report #6.
6. **Negative few-shot block** (cheap, high leverage on a small model): 3 compact wrong→right examples — invented company dates, invented certification, email placed in website.
7. **New fields**: extraction rules for email (verbatim, full address), dateOfBirth, nationality, address, hobbies, declaration; project role/duration/teamSize/responsibilities.

### Acceptance
- Eval: hallucination count strictly decreases vs Phase 1 report; no regression on coverage.

**Est. effort:** 1 day (incl. eval iterations).

---

## Phase 3 — Grounding Validator (anti-hallucination net)

New `app/parser/grounding.py`, applied post-merge in both whole and raw paths. Catches whatever prompts don't, independent of model choice.

1. **Verbatim-check fields** — value must appear in source text (normalized: casefold, whitespace/punct-fold):
   - certification names (drop entry if no fuzzy hit ≥ 0.75) — xlsx #6 (Abhinandan), #8 (Abhishek)
   - company names (blank the company, keep entry, if no hit) — xlsx #14
   - email / phone / URLs (already regex-owned after Phase 1 — validator just asserts)
2. **Date grounding** — a `startDate`/`endDate` year must occur somewhere in the source text (as `2016`, `16` adjacent to month names, etc.); otherwise null the date. Kills invented employment/education dates — xlsx #3, #5 (Abhishek), #17.
3. **Skill years grounding** — `yearsOfExperience` kept only if a number+`year` pattern co-occurs near the skill name in text; else null. Fixes xlsx #2–#4 (Abhinandan).
4. **Name grounding** — firstName/lastName tokens must appear in the first 15 lines of the resume; on mismatch prefer the longest name-cased line from the header block. Fixes xlsx #1 (Abhishek), #12 (Gaurang).
5. Log every dropped/blanked value (`[grounding]` prefix) so QA can audit false drops.

### Acceptance
- Eval hallucination count ≈ 0 for certs, dates, companies, skill-years across all 20 resumes; coverage drop from false-positive grounding < 2% (tune fuzz thresholds against this).

**Est. effort:** 1.5 days.

---

## Phase 4 — Model Upgrade (⛔ frozen until explicit "go")

**Qwen2.5-3B-Instruct → Qwen2.5-7B-Instruct-AWQ** on the existing `g4dn.xlarge` (T4 16 GB).

- **Cost: no change.** Same instance, same hourly rate. AWQ 4-bit 7B weights ≈ 5–6 GB (3B fp16 today ≈ 6–7 GB).
- Change surface: vLLM launch flag in `infra/qwen-ec2-user-data.sh` + `docs/qwen-ec2-runbook.md` + `llm_model` setting:
  ```
  --model Qwen/Qwen2.5-7B-Instruct-AWQ --quantization awq --max-model-len 10000
  ```
- Expected wins (where deterministic layers can't reach): name splitting on odd headers, per-entry grades, bullet-formatted summaries, tangled layouts (Gaurang company/duration — xlsx #14), residual hallucination.
- Tradeoffs: parse latency ~1.5–2× ↑; KV-cache headroom ↓ → context 12k → ~10k and/or `per_parse_concurrency` 3 → 2.
- Rollout: start second EC2 (or off-hours swap) → run Phase 0 eval on both models → compare → keep winner. Rollback = revert docker flag.
- **Only if 7B still < 90%:** evaluate Qwen2.5-14B-AWQ — requires `g5.xlarge` (~2× hourly cost) — separate approval.

**Est. effort:** 0.5 day + eval run.

---

## Bug Traceability Matrix

| Bug | Source | Fixed by |
|-----|--------|----------|
| Headline = first summary sentence | Report #1 | Phase 2.3 |
| State missing (Chennai → TN) | Report #2, xlsx #13 | Phase 1.5 |
| Bullet summary not parsed | Report #3, xlsx #11 | Phase 2.4 (+ Phase 4) |
| Email parsed as website | Report #4 | Phase 1.1 + 1.2 + 1.4 |
| Embedded LinkedIn hyperlink missed | Report #5 | Phase 1.3 |
| Only first education grade | Report #6 | Phase 2.5 (+ Phase 4) |
| LinkedIn duplicated in website | Report #7 | Phase 1.4 |
| Missing emails | Report #8, xlsx #16 | Phase 1.1 + 1.2 |
| Skill years/proficiency invented | xlsx #1–#5 (Abhinandan), #4 (Abhishek) | Phase 1.6 + 2.1 + 3.3 |
| Certifications invented | xlsx #6 (Abhinandan), #8 (Abhishek) | Phase 3.1 |
| Projects/experience duplicated | xlsx #7 (Abhinandan) | Phase 1.4 |
| Surname invented | xlsx #1 (Abhishek) | Phase 3.4 |
| LinkedIn URL invented | xlsx #2 (Abhishek) | Phase 1.2 (regex wins) + 3.1 |
| Employment dates/descriptions invented | xlsx #3, #5–#7 (Abhishek) | Phase 2.1 + 3.2 (+ Phase 4) |
| Project team/role/responsibilities missing | xlsx #10 | Phase 1.1 + 2.7 |
| Name mismatch | xlsx #12 (Gaurang) | Phase 3.4 (+ Phase 4) |
| Company/duration parsed wrong | xlsx #14 (Gaurang) | Phase 2 (+ Phase 4 — layout genuinely tangled) |
| Personal details missing (DOB, hobbies, declaration…) | xlsx #15 | Phase 1.1 + 2.7 |
| Education startDate invented | xlsx #17 | Phase 2.2 + 3.2 |

## Sequencing & Effort

| Phase | Depends on | Effort | Status |
|-------|-----------|--------|--------|
| 0 — Eval harness | — | 1.5–2 d | ready to start |
| 1 — Deterministic layer | 0 (for measurement) | 2–2.5 d | ready to start |
| 2 — Prompt hardening | 0, 1 | 1 d | after 1 |
| 3 — Grounding validator | 0, 1 | 1.5 d | after 2 |
| 4 — Model upgrade | 0 (eval) | 0.5 d | ⛔ awaiting "go" |

Total (0–3): **~6–7 working days**. Phases 0+1 can be done in parallel branches; 2 and 3 are sequential re-measured steps.
