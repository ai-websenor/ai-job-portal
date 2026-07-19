# Resume Parser Validation

## Purpose

Keep returned resume data traceable to source text. The parser uses Qwen
`Qwen/Qwen2.5-3B-Instruct`, then applies deterministic extraction and grounding
before any result reaches API, DB, or UI consumers.

## Business Rules

1. Model identity must match app config, ECS env, and EC2 vLLM deployment.
2. Source email, phone, LinkedIn, and GitHub values override conflicting AI values.
3. A recognized Indian city defines canonical state and country.
4. Hallucinated city/state/country values are removed.
5. Projects without a grounded name are removed. Unsupported project details are blanked.
6. Gender, DOB, nationality, marital status, address, hobbies, and declaration require a matching label and grounded value.
7. Whole, raw, and legacy chunked modes run one shared finalization pipeline.
8. Validation logs identify decisions only; never resume values or PII.

## Relationships

1-1:
- One parse job produces one validated `ResumeOutput`.
- Example: Asha's upload job returns one final profile result.

1-N:
- One validated resume can contain many projects, experiences, skills, and education entries.
- Example: Ravi's resume contains three projects; one invented fourth project is removed.

N-N:
- No new DB relation is introduced. Product usage remains many users creating many parse jobs over time.
- Example: Asha and Ravi each upload multiple resume versions; every job remains isolated.

## Multi-User Flow: A to Z

1. Candidate uploads PDF.
2. API creates an isolated parse job.
3. Global gate admits up to configured concurrent jobs.
4. PDF text and embedded links are extracted.
5. Qwen 3B returns candidate JSON.
6. Deterministic contacts and India location rules correct conflicts.
7. Grounding removes unsupported values.
8. API stores/publishes only validated output.
9. Candidate or recruiter reads the result.

Real example: Asha and Ravi upload together. Each job keeps separate source text and
result state. If capacity is full, another job waits; no resume data is shared.

## Edge Cases

- Same phone with different formatting is not treated as a conflict.
- Unknown cities are not mapped to an Indian state.
- A known Indian city survives only when the city itself appears in source text.
- Explicit personal fields may appear on the label line or its next line.
- Fuzzy project grounding favors removal over returning an invented project.

## QA Checks

1. Configure app + vLLM as 3B; parse succeeds without model-not-found response.
2. AI phone differs from labelled source phone; source phone wins.
3. `Delhi, Maharashtra, United States`; result becomes `Delhi, Delhi, India`.
4. Hallucinated city absent from resume; city/state/country become empty.
5. Invented project absent from resume; project is removed.
6. Labelled DOB/hobbies/declaration remain; unlabelled generated values are blank.
7. Check logs show field/action only, never names, contacts, addresses, or resume text.

## Rollback

Revert validator commit. Keep the 3B model alignment: changing only app or model server
can make every LLM request fail.
