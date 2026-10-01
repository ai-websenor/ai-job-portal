# Resume Parser Eval Harness (Phase 0)

Field-level accuracy scoring against hand-labelled ground truth. See
`docs/resume-parser-accuracy-plan.md` for the full phased plan this supports.

## Layout

- `ground_truth/<stem>.json` — hand-labelled expected `ResumeOutput` per resume.
  `<stem>` matches the filename (no extension) in `docs/test-docs/`.
- `cache/` — raw LLM responses, keyed by `<stem>.<prompt-hash>.raw.txt`, so
  re-scoring after a merge-layer or scorer change doesn't require a fresh GPU
  call. Cache auto-invalidates when the prompt text changes (hash mismatch).
- `parsed_output/` — actual pipeline output per resume (git-ignored; generated
  by `run_eval.py`).
- `score.py` — field-level comparison + report generation. Runnable standalone
  against any `parsed_output/` directory.
- `run_eval.py` — end-to-end: extract → LLM → merge → deterministic overrides
  → score → report.

## Ground truth coverage

**4 of 20** test resumes have ground truth today — the ones with numbered,
file-attributed bugs in `docs/JobBoard Ai Module Parsing Of Resume .xlsx`:

- `_Naukri_JGobhi[7y_8m]`
- `_Naukri_GaurangsinhSolanki[5y_2m]`
- `_AbhinandanS_10 Years_NoSql`
- `_Abhishek[3_6]` — **cannot be scored via the live pipeline**: the source
  file is `.docx`, but the production `/parse` endpoint only accepts PDF
  (`ALLOWED_TYPES = {"application/pdf": ...}` in `app/main.py`).
  `app/extractors/docx.py` exists but is never called — dead code. Either the
  main site converts DOCX→PDF before calling this service (needs
  confirmation) or DOCX resumes silently fail today. Flagged for the team;
  not fixed as part of this plan since it's a product/API decision, not an
  accuracy bug.

The remaining 16 resumes in `docs/test-docs/` need ground truth JSON added
the same way — read the resume, fill in `ResumeOutput` shape by hand. Follow
the field rules in `score.py`'s module docstring (exact / normalized / fuzzy
/ set per field group).

## Running

The LLM lives on a private EC2 host (`qwen-model.ai-job-portal.internal`,
see `docs/qwen-ec2-runbook.md`) only reachable from inside the VPC. From a
normal dev machine:

```bash
# Cache-only — scores whatever's already in cache/, no GPU calls, fails
# loudly (not silently) for any resume with no cached response yet.
python -m tests.eval.run_eval --no-live
```

From inside the VPC (or via an SSH tunnel to the qwen-model host):

```bash
# First run: calls the LLM, caches every response, scores, writes eval-report.md
python -m tests.eval.run_eval

# After a prompt/merge-layer change you want to re-measure without a fresh
# GPU call for every resume (cache is prompt-hash-keyed, so unchanged
# prompts still hit cache automatically):
python -m tests.eval.run_eval

# Force fresh LLM calls (e.g. testing prompt-wording changes, or model swap):
python -m tests.eval.run_eval --refresh

# Just one resume while iterating:
python -m tests.eval.run_eval --only jgobhi
```

`score.py` can also be run standalone against a `parsed_output/` directory
built any other way (e.g. a manually saved API response):

```bash
python tests/eval/score.py --parsed-dir tests/eval/parsed_output --report eval-report.md
```

## What the scorer checks

- **exact**: email, phone, linkedin, github, dates, grade, gender
- **normalized**: names, company, degree, institution, state/city (case/punct-folded)
- **fuzzy**: descriptions, summaries (token-F1 ≥ 0.6)
- **set**: skills, languages (by name)
- **hallucination**: value present in output, absent in ground truth
- **wrong value**: both sides non-empty but disagree (e.g. a fabricated headline replacing a real one) — tracked separately from misses/hallucinations for readability
- **schema-shape regression**: every legacy top-level + personalDetails key must still be present (additive-only compatibility check per the plan's API constraint)

List-shaped fields (experience, education, certifications, projects) are
paired expected↔actual by fuzzy key-field match (e.g. title+company) before
scoring their sub-fields, so a merely-reordered list doesn't tank accuracy.
