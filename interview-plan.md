# Interview Fixes — Implementation Plan & Changes

Branch: `krish/fix-new_interview_fixes`
Date: 2026-06-11

## Issues Reported

1. **Application status not changing** to `interview_rescheduled` / `interview_cancelled` when an interview is rescheduled or cancelled.
2. **Interview date filtering** — `toDate` (end date) was exclusive; interviews on the end date itself were missing from results.
3. **Rating lost on interview completion** — frontend sends `{ rating, notes }` to `POST /interviews/:id/complete`, but backend never saved the rating and never returned it on the interview details page.
4. **Timeline order wrong** — interview scheduled / rescheduled / cancelled events appeared out of order in the application history timeline.

---

## Root Causes

| # | Issue | Root cause |
|---|-------|-----------|
| 1 | Status not changing | `application_status` enum had no `interview_rescheduled` / `interview_cancelled` values; `InterviewService.update()` and `cancel()` only updated the `interviews` row, never the `job_applications` row and never wrote `application_history`. |
| 2 | End date exclusive | `getAll()` used `lte(scheduledAt, new Date(toDate))` — a date-only value like `2026-06-10` parses to midnight, excluding the whole end day. |
| 3 | Rating not saved | `interviews` table had no `rating` column; `complete()` only saved `interviewerNotes`. |
| 4 | Timeline order | Interview events used `interview.createdAt` as the timeline timestamp, so completed/rescheduled/cancelled events sorted at scheduling time, not at the time the status changed. |

---

## Database Changes

### Schema (`packages/database/src/schema/`)

- **`enums.ts`** — `applicationStatusEnum` gains two values:
  - `interview_rescheduled`
  - `interview_cancelled`
- **`applications.ts`** — `interviews` table gains column:
  - `rating: integer('rating')` (1–5, nullable)

### Migration: `packages/database/drizzle/0037_lowly_emma_frost.sql`

```sql
ALTER TYPE "public"."application_status" ADD VALUE 'interview_rescheduled' BEFORE 'interview_completed';
ALTER TYPE "public"."application_status" ADD VALUE 'interview_cancelled' BEFORE 'interview_completed';
ALTER TABLE "interviews" ADD COLUMN "rating" integer;
```

Additive only — no data risk. **Not yet applied.** Per workflow: apply on dev RDS first (`pnpm db:push`), then staging.

### Shared enum (`packages/common/src/enums/index.ts`)

`ApplicationStatus` enum gains `INTERVIEW_RESCHEDULED` and `INTERVIEW_CANCELLED`. `APPLICATION_STATUS_VALUES` (used by `UpdateApplicationStatusDto` validation) picks them up automatically.

---

## Backend Changes

### `apps/application-service/src/interview/interview.service.ts`

**`update()` (reschedule):**
- When rescheduled (`dto.status === 'rescheduled'` or `scheduledAt` changed):
  - Application status → `interview_rescheduled` (+ `updatedAt`).
  - New `application_history` row: `Interview rescheduled: <type> round moved to <formatted new time>`.

**`cancel()`:**
- Application status → `interview_cancelled`.
- New `application_history` row: `Interview cancelled[: <reason>]`.

**`complete()`:**
- Now saves `rating: dto.rating` on the `interviews` row alongside `interviewerNotes`.
- Rating returned automatically by `GET /interviews/:id` (details page) and included in `GET /interviews/list` enriched response (`rating` field).

**`getAll()` (list filter):**
- `toDate` date-only values (`YYYY-MM-DD`) extended to `23:59:59.999` UTC before comparison → end date now inclusive. Full ISO datetimes unchanged.

### `apps/application-service/src/application/application.service.ts`

**`updateStatus()` — `ALLOWED_TRANSITIONS`:**
- `interview_rescheduled`: employer → `hired`, `rejected`
- `interview_cancelled`: employer → `interview_scheduled`, `hired`, `rejected`
- Hired-block check now also treats `rescheduled` interviews as active (was only `scheduled` / `confirmed`).

**`withdraw()`:**
- 2-hour withdrawal block now applies to `interview_rescheduled` status too; upcoming-interview lookup covers `scheduled` / `confirmed` / `rescheduled` interview statuses.

**`getApplicationHistory()` (timeline):**
- `statusDescriptions` added: `interview_rescheduled`, `interview_cancelled`, `interview_completed`.
- Interview detail attachment (meeting link, time, etc.) now applies to `interview_rescheduled` history entries as well as `interview_scheduled`.
- **Timeline timestamp fix**: interview events now use the timestamp of when the status was reached:
  - `rescheduled` → `rescheduledAt` (fallback `updatedAt`)
  - all other statuses (completed/canceled/confirmed/no_show) → `updatedAt`
  - previously always `createdAt` → caused wrong ordering.

**`getCandidateStats()`:**
- "Interview scheduled" count now includes `interview_rescheduled`.

### `apps/messaging-service/src/thread/thread.service.ts`

- `EMPLOYER_CHAT_ALLOWED_STATUSES` and `CANDIDATE_CHAT_ALLOWED_STATUSES` gain `interview_rescheduled` and `interview_cancelled` — without this, chat would have been blocked once an application entered the new statuses.

---

## Frontend (NOT changed — for frontend team)

Backend now returns:
- `currentStatus` / timeline `status` may be `interview_rescheduled` or `interview_cancelled` — add labels/colors/icons where application statuses are rendered (timeline, application cards, filters).
- `GET /interviews/:id` and `GET /interviews/list` now include `rating: number | null` — display on interview details page.
- Timeline entries for reschedule carry interview details (meetingLink, scheduledAt, duration, etc.) same as `interview_scheduled` entries.

---

## Verification

- `turbo run build` green: `application-service`, `messaging-service`, all shared packages.
- Migration generated via `pnpm db:generate` (`0037_lowly_emma_frost.sql`).

## Remaining Steps

1. Apply migration to dev RDS (`pnpm db:push`), verify, then staging.
2. Frontend updates per section above.
3. Manual E2E: schedule → reschedule → check app status + timeline order; cancel → check status; complete with rating → check rating on details endpoint; list filter with `fromDate=toDate` same day.
