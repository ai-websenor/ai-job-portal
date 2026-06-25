# Interview Module Fixes — Implementation Plan

> Scope: `ai-job-portal/apps/job-board-web` (frontend) + `ai-job-portal/apps/application-service` (backend interview module).
> Approach: **one fix at a time** — implement → test locally → verify → then move to the next. Do not batch fixes.

---

## 0. Current flow (as-is)

### Frontend

There are **two parallel flows** that already share the detail component:

| Side | List page | List component | Detail page | Detail component |
|------|-----------|----------------|-------------|------------------|
| Candidate | `/interviews` | `InterviewCard` (card grid) + tabs (Upcoming/Completed/Canceled/All) | `/interviews/[applicationId]` | `InterviewRoundsTimeline` |
| Employer | `/employee/interviews` | `InterviewListTable` (table) + `InterviewsListFilters` | `/employee/interviews/[id]` | `InterviewRoundsTimeline` (same component) |

Key files:
- `src/app/(main)/interviews/page.tsx` — candidate list (cards, `withCandidateAuth`)
- `src/app/(main)/interviews/[applicationId]/page.tsx` — candidate detail
- `src/app/(main)/employee/interviews/page.tsx` → `InterviewListTable.tsx` — employer list
- `src/app/(main)/employee/interviews/[id]/page.tsx` — employer detail
- `src/app/components/interviews/InterviewRoundsTimeline.tsx` — **shared** detail/rounds view
- `src/app/components/interviews/InterviewRoundCard.tsx` — per-round card inside timeline
- `src/app/components/interviews/InterviewCard.tsx` — candidate list card
- `src/app/(main)/employee/interviews/[id]/InterviewDetails.tsx` — **DEAD CODE** (not imported by its page; page renders `InterviewRoundsTimeline`). Confirm + delete during cleanup.
- `src/app/utils/interviewActionUtils.ts` — `getInterviewActionAvailability()`
- `src/app/utils/permissionUtils.ts` — `hasPermission()`
- `src/app/components/dialogs/RescheduleInterviewDialog.tsx`, `CancelInterviewDialog.tsx`, `CompleteInterviewDialog.tsx`
- `src/app/(main)/employee/jobs/[id]/schedule/ScheduleInterviewForm.tsx` + `src/app/utils/validations.ts` (`scheduleInterviewSchema`)

### Backend

`apps/application-service/src/interview/`:
- `interview.controller.ts` — routes. Note role guards:
  - `POST /interviews`, `PUT /interviews/:id`, `:id/cancel`, `:id/complete`, `:id/feedback` → **employer/super_employer only**
  - `GET /interviews/list`, `GET /interviews/:id`, `GET /interviews/application/:applicationId`, `GET /interviews/upcoming/list` → employer + candidate
  - `POST /interviews/:id/candidate-feedback` → candidate only
- `interview.service.ts`:
  - `assertFutureDateTime()` — already blocks past dates on schedule + reschedule.
  - `enrichInterviewRow()` — flattens a row. **Returns `meetingLink` but NOT `hostJoinUrl`. No `reason` field.**
  - `getAll()` — returns **every round** (one row per interview) → employer list duplication.
  - `getRoundsByApplication()` — returns `{ application, rounds[], totalRounds, latestInterviewRound }`.

DB schema `packages/database/src/schema/applications.ts`:
- `interviews` columns include `meetingLink`, `hostJoinUrl`, `meetingPassword`, `interviewerNotes`, `rating`, `rescheduledAt`, `status`. **No `reason` / `cancellationReason` column.**
- Reschedule + cancel reasons are persisted only in `applicationHistory.metadata.reason` (with `eventType` = `INTERVIEW_RESCHEDULED` / `INTERVIEW_CANCELLED` and `interviewId` set). Completion note → `interviewerNotes`.

### Role detection on frontend
`useUserStore.getState().user?.role` ∈ `candidate | employer | super_employer`.
**Bug:** `permissionUtils.hasPermission()` returns `true` for any role that is not exactly `employer` — so **candidates and super_employers both bypass permission checks**. This is why candidates currently see employer action buttons in `InterviewRoundsTimeline`.

---

## Summary (read before starting)

Most tickets are **frontend role-gating** of an already-shared component, plus a few **backend data gaps**:

- **Pure frontend, role-gating / conditional UI:** #3, #4, #6, #9, #10, and the FE half of #1, #2.
- **Backend changes required:**
  - #5 — add `hostJoinUrl` to `enrichInterviewRow()` so employer can get host link, candidate gets attendee link.
  - #7 — surface per-round cancel/reschedule **reasons** (from `applicationHistory`) + completion notes; today the FE reads `round.reason` which the API never sends.
  - #8 — dedupe `getAll()` to one row per application (latest round) for the employer list.
  - #1 — already enforced server-side; just verify.

### Cross-cutting side-effects to watch
1. **`permissionUtils.hasPermission` semantics:** changing it affects every caller across the app, not just interviews. Safer to **not** change the global util; instead add an explicit role check (`isEmployerRole`) in interview components. (See #3/#4.)
2. **#2 reuse of `InterviewListTable` for candidates** changes the candidate list from cards → table. The candidate page currently has Upcoming/Completed/Canceled/All **tabs** + job search; employer has status/date/candidateName **filters**. These must be reconciled (see Open Questions). Reusing the table means the candidate loses the card UI — confirm that is the intent ("same listing table structure" implies yes).
3. **#8 dedupe** changes employer list row meaning from "a round" to "an application (latest round)". Pagination counts change (count distinct applications, not interviews). The per-round `status`/`scheduledAt` shown collapses to the latest round. Status filter becomes "applications having a round with this status".
4. **#5** must not leak `hostJoinUrl` to candidates. Gate by role in the API response or only consume `meetingLink` on candidate side. Recommended: API still returns both; FE picks host vs attendee by role. Safer alternative: API omits `hostJoinUrl` for candidate role.
5. **#7** reasons come from `applicationHistory`; an interview can have multiple reschedule events. Decide which reason to show (latest matching event per interview).
6. Candidate `/interviews/[applicationId]` and employer `/employee/interviews/[id]` share `InterviewRoundsTimeline` — every conditional must key off role, and the candidate route param is `applicationId` while employer is interview `id` (employer page resolves the interview then loads rounds by its `applicationId`).

---

## Open questions (confirm before / during the relevant fix)

1. **#2:** Convert candidate `/interviews` from card grid to the employer `InterviewListTable`? (Default assumed: **yes**, role-aware single component. The candidate keeps job-title search; loses the Upcoming/Completed/Canceled/All tab strip unless we re-add it as a status filter. Confirm tab vs filter handling.)
2. **#8:** In the deduped employer row, show the **latest round** (most recent `createdAt`) data (round #, status, date)? (Default assumed: **yes, latest round**.) Should we also show a "Round X of Y" / rounds count badge?
3. **#5:** Should the API hard-omit `hostJoinUrl` for candidate responses (defense in depth), or just return both and let FE choose? (Default assumed: return both, FE picks; revisit if security wants omission.)
4. File placement of this doc is repo root of `ai-job-portal`. Move if you prefer it under `DOCS/`.

---

# Fixes (one at a time)

Each fix: **Change → Files → Test locally → Verify → Done criteria.** Do not start the next fix until the current one is verified.

---

## Fix #1 — Block scheduling/rescheduling with a past date & time (FE + BE)

**Status:** Backend already enforces this (`assertFutureDateTime` on schedule + reschedule). Frontend pickers use `minValue={now(...)}` but the yup schema has no future check.

**Changes**
- BE: verify only. Confirm `POST /interviews` and `PUT /interviews/:id` reject past `scheduledAt` with 400 `"Interview cannot be scheduled/rescheduled in the past..."`.
- FE (`scheduleInterviewSchema` in `validations.ts`): replace `scheduledAt: yup.mixed().required(...)` with a test that the resolved datetime is in the future.
- FE (`RescheduleInterviewDialog.tsx`): add an explicit future guard in `handleReschedule` before submit (toast on past), in addition to `minValue`.

**Test locally**
- Try scheduling with a past time via UI (and via direct API call to bypass the picker) → expect 400 from BE and inline error from FE.
- Reschedule to a past time → blocked both layers.

**Done when:** past datetimes are rejected at FE (inline message) and BE (400), for both schedule and reschedule.

---

## Fix #2 — Reuse the employer listing table structure for candidates

**Goal:** Candidate `/interviews` uses the same table structure as `/employee/interviews` (`InterviewListTable`), with role-conditional columns/filters/actions.

**Changes**
- Make `InterviewListTable` role-aware:
  - Read role from `useUserStore`.
  - Endpoint is the same (`/interviews/list` for both; backend `getAll` already branches by role).
  - Row click target: employer → `routePaths.employee.interviews.details(id)`; candidate → `routePaths.interviews.rounds(applicationId)`.
  - Columns: candidate should not see the "Candidate" column (it's them); instead show **Company**. (Ties into #6.)
- Point candidate `/interviews/page.tsx` at the shared table (replace the `InterviewCard` grid), preserving job-title search. Decide tabs vs status filter per Open Question #1.

**Test locally**
- Candidate `/interviews` renders the table with the same look as employer.
- Employer `/employee/interviews` unchanged.

**Done when:** both sides render the same table component; row click routes correctly per role.

---

## Fix #3 — Hide employer actions & employer-only filters for candidates (list + detail)

**Root cause:** `permissionUtils.hasPermission` returns `true` for non-employers.

**Changes**
- Add a small role helper (e.g. `isEmployerRole(role)` = `employer || super_employer`). **Do not** alter the global `hasPermission` semantics (would ripple app-wide).
- `InterviewListTable`: render the `Actions` column + `InterviewActionsSelect` only for employer roles. Render `InterviewsListFilters` (status/date/candidateName) only for employer; candidate gets the candidate-appropriate filters (job search, status).
- `InterviewRoundsTimeline`: gate the action buttons block by `isEmployerRole` (covers #4/#9 too).

**Test locally**
- Log in as candidate: no Actions column, no candidate-name filter, no action buttons.
- Log in as employer + super_employer: full controls present.

**Done when:** candidate sees zero employer controls; employer/super_employer unaffected.

---

## Fix #4 — Detail page (candidate): hide Reschedule / Cancel / Complete

**Changes**
- In `InterviewRoundsTimeline`, wrap the Reschedule/Cancel/Complete buttons (and their dialogs) in `isEmployerRole`. The existing `actionState` from `getInterviewActionAvailability` stays for employers.

**Test locally**
- Candidate detail (`/interviews/<applicationId>`): no Reschedule/Cancel/Complete.
- Employer detail: buttons appear per existing availability rules.

**Done when:** candidate detail header shows no employer action buttons.

---

## Fix #5 — Join meeting link: candidate = attendee link, employer = host link

**Goal flow:** candidate joins directly (attendee link) → employer joins as **host** (host link) and admits the candidate from the waiting room → video call starts.

**Root cause:** `enrichInterviewRow` omitted `hostJoinUrl`; FE used `meetingLink` for everyone, so the employer joined as a plain attendee (no host/admit control).

**Link mapping (from `packages/video-conferencing`):**
- `meetingLink` = Zoom `join_url` → **attendee** (candidate)
- `hostJoinUrl` = Zoom `start_url` → **host** (employer; auto-authenticates as host, enables waiting-room admit)

**Provider behavior — important:**
- **Zoom:** goal is fully achievable. Employer must open `hostJoinUrl` (`start_url`) to enter as host and admit; candidate opens `meetingLink` (`join_url`).
- **Teams:** host role is tied to the organizer's Microsoft account, **not** the URL (`joinUrl` is the same link for everyone; `hostJoinUrl` is just a constructed meetup-join link). Picking the link by role is harmless but does not, by itself, grant host powers the way Zoom's `start_url` does — host/admit comes from being signed into the organizing MS account.

**Changes**
- BE `enrichInterviewRow()`: add `hostJoinUrl: interview.hostJoinUrl` to the returned object — flows into `getAll`, `getRoundsByApplication`, `getDetailsForUser`. **(DONE — backend.)** (Optionally omit it for candidate role — Open Question #3.)
- FE `InterviewRoundCard.handleJoin` (and `InterviewCard` join button): choose the link by role. Backend now sends both fields, so:
  ```ts
  const isHost = role === 'employer' || role === 'super_employer';
  const url = isHost ? (round.hostJoinUrl || round.meetingLink) : round.meetingLink;
  ```
  Open `url` instead of always `round.meetingLink`.
- Keep the existing join-window / status gating (`canJoin`).

**Test locally (Zoom)**
- Online Zoom interview, both links present: employer Join opens `start_url` (enters as host); candidate Join opens `join_url` (waiting room) → employer admits → call starts.
- Only `meetingLink` present: both roles fall back to it.

**Done when:** employer opens the host URL (Zoom `start_url`) and candidate opens the attendee URL, per role; full join → admit → call-start flow works on Zoom.

---

## Fix #6 — Detail card image & name conditional by role

**Target:** `InterviewRoundsTimeline` header card.

**Changes (role-conditional):**
- **Avatar image:**
  - Candidate side → company logo (`application.companyLogo`), fallback to company initials.
  - Employer side → candidate profile photo (`candidateProfilePhoto`), fallback to candidate initials.
- **Name/labels:**
  - Candidate role → show **company name**, hide candidate name chip.
  - Employer/super_employer role → show **candidate name**, hide company name chip.
- Data already available: `getRoundsByApplication` returns `application.companyLogo`, `companyName`, `candidateName`; enriched rounds carry `candidateProfilePhoto`. (Add `companyLogo` to enriched round if needed for per-round consistency — currently it's on `application`.)

**Test locally**
- Candidate detail: company logo + company name, no candidate name.
- Employer detail: candidate photo + candidate name, no company name.
- Missing image → initials fallback on both.

**Done when:** image source and name shown match the viewing role.

---

## Fix #7 — Round card: rating, cancel reason, completion note, reschedule reason (both sides)

**Root cause:** `interviews` has no `reason` column; reasons live in `applicationHistory.metadata.reason`. FE reads `round.reason` which the API never populates → nothing shows. Completion note IS available (`interviewerNotes`).

**Changes**
- BE: in `getRoundsByApplication` (and `getDetailsForUser` if the single-round detail needs it), fetch `applicationHistory` rows for the application where `interviewId` is set, and attach to each enriched round:
  - `rescheduleReason` — latest `INTERVIEW_RESCHEDULED` event's `metadata.reason` for that `interviewId`.
  - `cancelReason` — `INTERVIEW_CANCELLED` event's `metadata.reason`.
  - (completion note already = `interviewerNotes`.)
  - Keep `rating` (already enriched).
- FE `InterviewRoundCard`: render conditionally by status:
  - `completed` → show `rating` (already) **and** completion `interviewerNotes` (labeled "Completion Note").
  - `canceled`/`cancelled` → show `cancelReason` (labeled "Cancellation Reason").
  - `rescheduled` → show `rescheduleReason` (labeled "Reschedule Reason").
  - Stop unconditionally labeling `round.reason` as "Reschedule Reason".
- Show on **both** employer and candidate sides (read-only info, no role gating here).

**Test locally**
- Reschedule a round with a reason → reason shows on both sides.
- Cancel a round with a reason → cancellation reason shows.
- Complete with note + rating → note + stars show.

**Done when:** each round surfaces the correct contextual reason/note/rating for its status, both roles.

---

## Fix #8 — Remove duplicate rows in employer list (one application → one row)

**Root cause:** `getAll()` returns one row per interview round; an application with N rounds appears N times.

**Changes (backend)**
- In `getAll()` (employer branch), collapse to **one row per application**, choosing the **latest round** (max `createdAt`) as the representative row. Options:
  - Query distinct latest interview per `applicationId` (e.g. window function / group-by on `applicationId` taking max `createdAt`), then paginate over **applications**, and `count(distinct applicationId)` for pagination.
- Optionally include a `roundsCount` / `latestRoundNumber` so the row can show "Round X" + total.
- Candidate branch: decide whether to also dedupe (their list, per #2, is per-application too) — recommended **yes** for consistency.
- Row click already routes to the detail page which loads **all** rounds via `getRoundsByApplication` — no change needed there.

**Caution / side-effects**
- Pagination math must switch to counting applications, not interviews.
- Status/type/mode/date filters now match "applications that have a round matching the filter"; representative row is still the latest round. Document this behavior.

**Test locally**
- Application with 3 rounds → employer list shows **one** row. Click → detail shows all 3 rounds.
- Pagination counts reflect applications.

**Done when:** no duplicate application rows in the employer (and candidate) list; detail still shows every round.

---

## Fix #9 — Detail page (candidate): remove "Add Round" button

**Changes**
- Same mechanism as #4: in `InterviewRoundsTimeline`, gate the `+ Add Round` button by `isEmployerRole` (and existing `actionState.canAddRound`).

**Test locally**
- Candidate detail: no "Add Round".
- Employer detail: "Add Round" appears when latest round is `completed` (existing rule).

**Done when:** candidate never sees "Add Round".

---

## Fix #10 — Design consistency across roles (conditional, not duplicated)

**Goal:** Both sides use the **same components** (`InterviewListTable`, `InterviewRoundsTimeline`, `InterviewRoundCard`); role only toggles visibility of elements — no forked layouts.

**Changes / checklist**
- Confirm candidate and employer use the same list + detail components after #2–#9.
- Centralize the role check (`isEmployerRole`) and reuse everywhere.
- Remove dead `InterviewDetails.tsx` (confirm no imports) to avoid divergence.
- Visual parity pass: spacing, chips, status colors identical for both roles.

**Test locally**
- Side-by-side candidate vs employer: identical structure, differing only in role-gated elements.

**Done when:** one set of components renders both roles; no duplicated/divergent UI; dead code removed.

---

## Suggested execution order

1. **#1** (verify BE + harden FE) — low risk warm-up.
2. **#3** (role helper) — unblocks #4, #9, and candidate filter hiding.
3. **#4**, **#9** — quick wins on the shared detail once #3 lands.
4. **#5** (BE `hostJoinUrl` + FE pick).
5. **#6** (role-conditional image/name).
6. **#7** (BE reasons + FE display).
7. **#2** (candidate adopts the table) — larger UI change; do after detail is solid.
8. **#8** (BE dedupe) — highest-risk (pagination); isolate and test hard.
9. **#10** (consistency sweep + dead-code removal) — final pass.

> After each fix: run the relevant service (`pnpm dev:core` / `pnpm dev:application`) + `cd apps/job-board-web && npm run dev`, verify the specific scenario, then commit before starting the next.
