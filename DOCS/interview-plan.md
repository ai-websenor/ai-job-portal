# Interview — Frontend Integration Plan

Audience: **frontend developers** (web `apps/job-board-web` + React Native mobile).
This file describes only what the frontend needs: features, UI/UX expectations, the APIs to call, request params/payloads, enums, and response shapes. Backend implementation details live in the service code, not here.

Date: 2026-06-12

---

## What changed that affects existing screens

Recent backend updates change data the frontend already renders:

1. **New application statuses** — an application's `currentStatus` (and timeline `status`) can now be `interview_rescheduled` or `interview_cancelled`. Add labels / colors / icons wherever application statuses are shown (timeline, application cards, filters, status badges).
2. **Interview `rating`** — `GET /interviews/:id` and `GET /interviews/list` now include `rating: number | null` (1–5). Show it on the interview details / completed rounds.
3. **Reschedule timeline entries** — timeline entries for a reschedule now carry full interview details (meetingLink, scheduledAt, duration, etc.), same as an `interview_scheduled` entry. Render them the same way.

---

# Feature: "My Interviews" Tab (Candidate)

A candidate-facing section showing all of a candidate's interviews — completed, canceled, upcoming — with filters, job title / job ID search, and a per-job detail page that tracks every interview round.

Both web and React Native consume the same candidate-scoped APIs. The candidate is always the authenticated user — **no userId is sent in any request**; the API derives it from the token. Mobile only uses the read endpoints below (schedule / cancel / complete are employer-only and out of scope).

## Available APIs

| Need | Endpoint | Status |
|------|----------|--------|
| List all interviews, candidate-scoped, with filters | `GET /api/v1/interviews/list` | ✅ available |
| Filters: status / type / mode / date range | query params on `/list` | ✅ available |
| Upcoming-only shortcut | `GET /api/v1/interviews/upcoming/list` | ✅ available |
| Search by job **title** | `?jobName=` (partial, case-insensitive) | ✅ available |
| Search by job **ID** | `?jobId=` (exact UUID) | ✅ available |
| All **rounds** of one job's interview (history track) | `GET /api/v1/interviews/application/:applicationId` | ✅ available |
| Single round detail (owner-scoped) | `GET /api/v1/interviews/:id` | ✅ available |

---

# API Reference

All endpoints require `Authorization: Bearer <accessToken>`. Base URL: `{{API_BASE}}/api/v1`.

Every response is wrapped by the global interceptor:

```jsonc
{
  "data": <payload>,
  "message": "Operation successful",
  "status": "success",
  "statusCode": 200,
  "pagination": { ... }   // only on paginated list endpoints
}
```

### A. List interviews — `GET /interviews/list`
Candidate-scoped (returns only this candidate's interviews).

**Query params** (all optional):
| Param | Type | Notes |
|-------|------|-------|
| `status` | enum `InterviewStatus` | single value |
| `interviewType` | enum `InterviewType` | single value |
| `interviewMode` | enum `InterviewMode` | single value |
| `fromDate` | ISO 8601 string | inclusive lower bound on `scheduledAt` |
| `toDate` | ISO 8601 string | inclusive; a date-only `YYYY-MM-DD` is extended to 23:59:59.999 UTC |
| `jobName` | string | partial, case-insensitive title match |
| `jobId` | UUID | exact job match |
| `sortBy` | `scheduledAt` \| `createdAt` | default `scheduledAt` |
| `sortOrder` | `asc` \| `desc` | default `desc` |
| `page` | int ≥ 1 | default 1 |
| `limit` | int 1–100 | default 20 |

**Response**: `data` = array of interview rows (shape below). `pagination` = `{ totalInterviews, pageCount, currentPage, hasNextPage }`.

> The API takes a **single** `status` value, not a list. For an "Upcoming" tab covering scheduled + confirmed + rescheduled, use endpoint B instead.

### B. Upcoming interviews — `GET /interviews/upcoming/list`
Returns scheduled + confirmed + rescheduled interviews with `scheduledAt >= now`.
**Query**: `page`, `limit`. **Response**: same interview-row shape + pagination.

### C. Rounds for an application — `GET /interviews/application/:applicationId`
All interview rounds for a single application, ordered oldest-first, as a history/status track. Owner-scoped (the candidate applicant; else `403`).

**Path param**: `applicationId` (UUID). No query params. Not paginated.

**Response `data`**:
```jsonc
{
  "application": {
    "id": "uuid",
    "jobId": "uuid | null",
    "jobTitle": "Senior React Native Engineer | null",
    "companyName": "TechCorp | null",
    "companyLogo": "https://signed-s3-url... | null",
    "candidateId": "uuid | null",
    "candidateName": "Asha Rao | null",
    "currentStatus": "interview_scheduled"   // ApplicationStatus enum
  },
  "rounds": [ /* interview-row shape, ordered oldest-first */ ],
  "totalRounds": 3
}
```

### D. Single interview detail — `GET /interviews/:id`
Returns one enriched interview row (shape below). Owner-scoped — `403` if the interview isn't the caller's.

### Interview-row shape (returned by A, B, C.rounds, D)
```jsonc
{
  "id": "uuid",
  "applicationId": "uuid",
  "jobId": "uuid | null",
  "jobTitle": "string | null",
  "candidateId": "uuid | null",
  "candidateName": "string | null",
  "candidateProfilePhoto": "https://signed-s3-url | null",
  "companyName": "string | null",
  "companyLogo": "https://signed-s3-url | null",
  "interviewType": "technical",        // InterviewType
  "interviewMode": "online",           // InterviewMode | null
  "interviewTool": "zoom",             // InterviewTool | null
  "scheduledAt": "2026-05-14T10:30:00.000Z",
  "duration": 60,                       // minutes
  "location": "string | null",          // offline only
  "meetingLink": "https://... | null",  // online only
  "status": "scheduled",                // InterviewStatus
  "interviewerNotes": "string | null",
  "rating": 4,                          // 1–5 | null
  "candidateFeedback": "string | null",
  "feedback": { /* interviewFeedback row */ } | null,
  "rescheduledAt": "2026-05-12T09:00:00.000Z | null",
  "createdAt": "2026-05-01T08:00:00.000Z",
  "updatedAt": "2026-05-12T09:00:00.000Z"
}
```

### Error responses
Standard wrapper with `status: "error"`:
| Code | When |
|------|------|
| 400 | invalid query (malformed UUID `jobId`, bad enum, bad date) |
| 401 | missing / expired token |
| 403 | `:id` or `application/:applicationId` not owned by the caller |
| 404 | interview / application not found |

---

# Enums

```ts
// InterviewType
'phone' | 'video' | 'in_person' | 'technical' | 'hr' | 'panel' | 'assessment'

// InterviewMode
'online' | 'offline'

// InterviewTool (online only)
'zoom' | 'teams' | 'phone' | 'other'

// InterviewStatus  (a round's status)
'scheduled' | 'confirmed' | 'completed' | 'rescheduled' | 'canceled' | 'no_show'

// ApplicationStatus (application.currentStatus — interview-related subset)
'interview_scheduled' | 'interview_rescheduled' | 'interview_cancelled'
| 'interview_completed' | 'hired' | 'rejected' | ...
```

### Suggested badge colors
| Status | Color intent |
|--------|--------------|
| `scheduled` | blue / info |
| `confirmed` | teal |
| `rescheduled` / `interview_rescheduled` | amber / warning |
| `completed` / `interview_completed` | green / success |
| `canceled` / `interview_cancelled` | red / danger |
| `no_show` | grey / muted |

### Type → label
phone → "Phone screening", video → "Video", in_person → "In-person", technical → "Technical", hr → "HR round", panel → "Panel", assessment → "Assessment".

---

# Web (`apps/job-board-web`)

1. **Navbar tab** "My Interviews" (candidate role only) → list page.
2. **List page**
   - Tabs/segments: Upcoming · Completed · Canceled · All. Upcoming = endpoint B; the others = `/list` with `status` (or no status for All).
   - Filters: interview type, mode, date range (`fromDate`/`toDate`).
   - Search: job title (`jobName`) and/or job ID (`jobId`).
   - Sort: `scheduledAt` / `createdAt`, asc/desc.
   - Pagination: `page`/`limit`; **reset `page` to 1 whenever any filter / search / tab / sort changes.**
   - Card → click → rounds track page (pass `applicationId`).
3. **Rounds track page** — endpoint C
   - Header: job title, company name/logo, `currentStatus`.
   - Vertical timeline of `rounds[]` (oldest→newest): per round show type, mode/tool, `scheduledAt`, duration, location/meetingLink, `status` badge, `rating`, `feedback`.

---

# React Native (mobile) — NOT STARTED — full build spec

The mobile flow does not exist yet. Below is the complete spec: navigation, screen-by-screen UI, and all UI states. APIs/enums/payloads are in the sections above.

## User flow

```
Bottom Tab "Interviews"  (candidate role only; hide for employers)
        │
        ▼
┌─────────────────────────────┐        ┌─────────────────────────────┐
│  InterviewListScreen        │  tap   │  InterviewRoundsScreen      │
│  - segmented status tabs    │ ─────▶ │  (per application)          │
│  - filters (sheet)          │  card  │  - job/company header       │
│  - search (title / jobId)   │        │  - vertical rounds timeline │
│  - paginated list           │        │  - tap round → detail sheet │
└─────────────────────────────┘        └─────────────────────────────┘
                                                   │ tap round
                                                   ▼
                                        ┌─────────────────────────────┐
                                        │  RoundDetailSheet/Screen    │
                                        │  GET /interviews/:id        │
                                        └─────────────────────────────┘
```

Primary job-to-be-done: candidate opens the tab, sees upcoming interviews first, filters/searches, taps one to see the full round-by-round history of that job's interview process with statuses, ratings, and feedback.

## Navigation

- Add a tab/stack entry **"Interviews"** in the candidate tab navigator. Icon: calendar/clipboard. Optional v2 badge: count of upcoming interviews.
- Stack inside the tab:
  - `InterviewList` (root)
  - `InterviewRounds` — params `{ applicationId: string, jobTitle?: string }` (pass `jobTitle` for an instant header while loading)
  - `RoundDetail` — params `{ interviewId: string }` (may be a bottom sheet instead of a screen)

## Screen: InterviewListScreen

### Layout
- **Header**: title "My Interviews" + search icon.
- **Segmented control** (status tabs): `Upcoming` · `Completed` · `Canceled` · `All`.
- **Filter row**: "Filters" chip (opens bottom sheet) + active-filter chips (dismissable). Sort toggle (date ↑/↓).
- **Search bar** (collapsible): single input; if the value matches a UUID v4 → send as `jobId`, else send as `jobName`. Show a "searching by Job ID" hint when a UUID is detected.
- **List**: `FlatList` of interview cards, infinite scroll (append while `hasNextPage`), pull-to-refresh.

### Interview card (per `data[]` row)
- Company logo (`companyLogo`, signed URL, may be null → placeholder).
- `jobTitle` (bold), `companyName`.
- Status badge (`status`).
- `interviewType` chip + `interviewMode` icon (online/offline).
- `scheduledAt` formatted in device locale (e.g. "Wed, 14 May 2026 · 3:30 PM"); `duration` min.
- If online + `meetingLink` + upcoming → "Join" button (enable from ~15 min before).
- `rating` stars when present (completed rounds).

### Segment → request mapping
| Segment | Request |
|---------|---------|
| Upcoming | `GET /interviews/upcoming/list?page&limit` |
| Completed | `GET /interviews/list?status=completed` |
| Canceled | `GET /interviews/list?status=canceled` |
| All | `GET /interviews/list` (no status) |

### Filters bottom sheet
- **Interview type**: single-select chip group for v1 (API takes one `interviewType`).
- **Interview mode**: `online` / `offline` (single).
- **Date range**: `fromDate` / `toDate` pickers → ISO 8601. Date-only `YYYY-MM-DD` is accepted.
- **Sort**: `sortBy` = `scheduledAt` | `createdAt`; `sortOrder` = `asc` | `desc` (default `desc`).
- Apply / Reset buttons.

### Critical behavior
- **Reset `page` to 1 on ANY change** of segment, filter, search, or sort.
- Debounce search input ~400 ms.

### UI states
- Loading (first page): skeleton cards.
- Loading (next page): footer spinner.
- Empty: illustration + "No interviews found" (+ "Try adjusting filters" if filters active).
- Error: retry button; show API `message`.

## Screen: InterviewRoundsScreen

`GET /interviews/application/:applicationId` on mount.

### Layout
- **Header card**: `companyLogo`, `jobTitle`, `companyName`, overall `currentStatus` badge, `totalRounds` ("3 rounds").
- **Vertical timeline** of `rounds[]` (already oldest→newest):
  - Each node = one round; connector line between nodes; node color by round `status`.
  - Round card: round index ("Round 1"), `interviewType`, `interviewMode`/`interviewTool`, `scheduledAt` + `duration`, `status` badge, `rating` (if any), truncated `feedback`/`interviewerNotes`.
  - If `rescheduledAt` present → show "Rescheduled" hint with that time.
  - Tap round → `RoundDetail` (or expand inline).
- Pull-to-refresh re-fetches.

### UI states
- Loading: header skeleton + 3 ghost timeline nodes.
- Empty rounds (`totalRounds === 0`): "No interviews scheduled yet for this application."
- 403: "You don't have access to this." → pop back.
- 404: "Application not found."

## Screen/Sheet: RoundDetail

`GET /interviews/:id`. Full single-round view: type, mode, tool, `scheduledAt`, `duration`, `location` (offline) or `meetingLink` (online), `status`, `rating`, `interviewerNotes`, `candidateFeedback`, `feedback`, `rescheduledAt`. Join button for online upcoming. `403` → not owner (pop back).

---

# Mobile implementation checklist

- [ ] Add `Interviews` tab to candidate navigator (role-gated).
- [ ] API client methods: `getInterviews(query)`, `getUpcomingInterviews(page, limit)`, `getInterviewRounds(applicationId)`, `getInterviewById(id)`.
- [ ] Shared `InterviewCard`, `StatusBadge`, `RoundTimelineNode` components + enum→label/color maps.
- [ ] List screen: segments, filter sheet, UUID-aware search, infinite scroll, pull-to-refresh, **page reset on filter change**.
- [ ] Rounds screen: header + timeline.
- [ ] Round detail sheet/screen + Join button (online, within window).
- [ ] Empty / loading / error states for each screen.
- [ ] Handle signed-URL nulls (logo/photo placeholders).
- [ ] Date formatting in device timezone (backend stores UTC).
