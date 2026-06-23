# Interview Bug Fixes & Add-ons — Frontend Implementation Plan

Companion to the backend changes (application-service `interview` module + `interview_mode`
enum). Backend is **done**; this doc lists the `job-board-web` edits needed to consume them.

Scope: 5 items.
1. `companyName` on the upcoming-interviews list.
2. Interview **mode** allowed values changed to `on_site`, `online`, `phone` (was `online`, `offline`).
3. `latestInterviewRound` added to `GET /interviews/application/:id`.
4. `GET /interviews/upcoming/list` now accepts `interviewType` + `interviewMode` filters.
5. Interview time-conflict (double-booking) detection — backend bug fixed; verify the modal.

---

## Backend contract (already shipped)

- `interview_mode` enum is now **`online | on_site | phone`** (DB migration `0042`,
  `offline` renamed in-place to `on_site`). Any existing UI value `offline` must become `on_site`.
- `GET /interviews/upcoming/list?page&limit&interviewType&interviewMode`
  - each item now includes `companyName` (flattened from `job.employer.company.name`).
  - `interviewType` ∈ `phone|video|in_person|technical|hr|panel|assessment|other`
  - `interviewMode` ∈ `online|on_site|phone`
- `GET /interviews/application/:id` response `data` now has
  `latestInterviewRound` (the highest-roundNumber enriched round, or `null`).
- `POST /interviews` and `PUT /interviews/:id` return `409` with
  `{ code: 'INTERVIEW_TIME_CONFLICT', message, conflicts[] }` on overlap unless
  `ignoreConflict: true` is sent. (Conflict scope = the single logged-in employer.)

---

## 1. Mode enum: `offline` → `on_site` + add `phone` (item 2) — do this first

These are the source-of-truth changes everything else depends on.

- `src/app/types/enum.ts:67` — update the enum:
  ```ts
  export enum InterviewModes {
    online = 'online',
    on_site = 'on_site',
    phone = 'phone',
  }
  ```
  (Removing `offline` will surface every consumer via TS errors — follow them.)

- `src/app/(main)/interviews/page.tsx:33` — list filter options:
  ```ts
  const INTERVIEW_MODES = ['online', 'on_site', 'phone'] as const;
  ```
  Labels already render via `CommonUtils.keyIntoTitle(mode)` (line 233) →
  `on_site` shows as "On Site". Confirm that reads acceptably; otherwise add an
  explicit label map (`online → Online`, `on_site → On-site`, `phone → Phone`).

- `src/app/(main)/employee/jobs/[id]/schedule/ScheduleInterviewForm.tsx`
  - `:39` default `interviewMode: InterviewModes.offline` → `InterviewModes.on_site`
    (or default to `online`; pick the product default).
  - `:115` / `:119` / `:125` / `:135` — the `online` vs `offline` branching that
    toggles meeting-link/tool vs location fields. Rework to 3 modes:
    - `online` → show interview tool + meeting link (current online branch).
    - `on_site` → show **location** (current offline branch).
    - `phone` → show neither tool nor location; phone number optional. New branch.
  - `:317`–`:321` — the mode `Select` maps `Object.values(InterviewModes)`, so it
    picks up the 3 values automatically once the enum changes. Verify labels.

- `src/app/utils/validations.ts` — any schema that requires `location` when
  `interviewMode === 'offline'` must switch to `=== 'on_site'`, and must **not**
  require location/meeting-link for `phone`. (Grep `offline` here.)

- Grep the whole web app for remaining `'offline'` / `InterviewModes.offline`
  literals (display chips, icons, filters) and migrate to `on_site` / `phone`.
  Known files from the audit: `InterviewDetails.tsx`, `InterviewListTable.tsx`,
  `InterviewCard.tsx`, `InterviewRoundsTimeline.tsx`, `RescheduleInterviewDialog.tsx`,
  `types/types.ts`.

---

## 2. `companyName` on upcoming list (item 1)

- `src/app/(main)/interviews/page.tsx` — the upcoming list now gets `companyName`
  per row. Render it on the upcoming card/row (alongside job title).
- `src/app/components/interviews/InterviewCard.tsx` (and/or `InterviewListTable.tsx`):
  add a `companyName` field to the row type and display it. The non-upcoming
  `/interviews/list` already returned `companyName` via the enriched row, so the
  card may already support it — just confirm the upcoming branch passes it through.
- Update the row TS type in `types/types.ts` to include `companyName?: string | null`.

---

## 3. Upcoming list filters: type + mode (item 4)

- `src/app/(main)/interviews/page.tsx:56` — currently `buildQueryParams` **skips**
  all filters for the upcoming segment:
  ```ts
  if (options.segment !== 'upcoming') { /* type, mode, dates, sort, search */ }
  ```
  Move `interviewType` and `interviewMode` **out** of this guard so they are sent
  for `upcoming` too (backend now supports them). Keep `fromDate/toDate/sortBy/
  sortOrder/search` gated to the non-upcoming segment unless backend adds them.
  ```ts
  if (options.interviewType) params.interviewType = options.interviewType;
  if (options.interviewMode) params.interviewMode = options.interviewMode;
  if (options.segment !== 'upcoming') { /* dates, sort, search */ }
  ```
- The mode/type `Select` controls already exist (`:222`+). Make sure they are
  visible (not hidden) when `segment === 'upcoming'`.

---

## 4. `latestInterviewRound` (item 3)

- Consumer of `GET /interviews/application/:id`: the application/interview detail
  view (e.g. `InterviewRoundsTimeline.tsx` / `TrackTimeline.tsx` /
  `employee/interviews/[id]/InterviewDetails.tsx`).
- Add `latestInterviewRound` to the response type for that endpoint.
- Use it to highlight the current round / drive the header summary instead of
  re-deriving "last round" from the `rounds[]` array on the client.

---

## 5. Conflict modal — verify (item 5)

Backend bug fixed (overlap query was missing real overlaps due to a timestamp
timezone-cast mismatch). No new contract; just confirm the existing flow works:

- `src/app/components/dialogs/ConflictDatesDialog.tsx` — the 409
  `INTERVIEW_TIME_CONFLICT` handler. Confirm it:
  - reads `error.response.data.conflicts[]` and lists them, and
  - on "Schedule anyway" **resends the same payload with `ignoreConflict: true`**.
- Verify both the schedule form (`ScheduleInterviewForm.tsx`) and the reschedule
  dialog (`RescheduleInterviewDialog.tsx`) catch the 409 and open the modal —
  the backend returns it on **both** `POST` and `PUT`.
- Regression test: as one employer, schedule two interviews for **different
  candidates** at overlapping times → expect the 409 modal. (Same-candidate
  second round is blocked earlier by the "complete current round" rule — that is a
  different message, not the conflict modal.)

---

## QA checklist

- [ ] Schedule form: online → tool/link; on_site → location; phone → neither.
- [ ] No `offline` string remains in the UI (chips, filters, defaults).
- [ ] Upcoming list shows company name per row.
- [ ] Upcoming list type & mode filters change results.
- [ ] Application detail uses `latestInterviewRound`.
- [ ] Conflict modal fires on overlapping schedule AND reschedule; "schedule anyway" resends with `ignoreConflict`.
