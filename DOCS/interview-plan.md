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

# Web (`apps/job-board-web`) — Candidate "My Interviews" — NOT STARTED — full build spec

The candidate-facing interview experience does **not exist on web yet** (today only the employer side at `/employee/interviews` is built). Below is the complete spec: routing, components, screen-by-screen UI, request mapping, and all states. APIs/enums/response shapes are in the **API Reference** + **Enums** sections above (endpoints A–D). **No backend changes needed.**

This mirrors the React Native spec below — same APIs, same read-only scope (candidate never schedules/cancels/completes; those are employer-only).

## Routing & files

Add candidate routes (not under `/employee`). Suggested:
- `apps/job-board-web/src/app/(main)/interviews/page.tsx` — list (root)
- `apps/job-board-web/src/app/(main)/interviews/[applicationId]/page.tsx` — rounds track for one application

Add to `apps/job-board-web/src/app/config/routePaths.ts` (candidate section), e.g.:
```ts
candidate: {
  interviews: {
    list: '/interviews',
    rounds: (applicationId: string) => `/interviews/${applicationId}`,
  },
}
```
Wrap pages in the existing candidate auth HOC (`withAuth`) and **role-gate to `candidate`** (hide the navbar tab for employers).

Reuse existing patterns from the employer side where possible: `usePagination` hook, `LoadingProgress`, `NoDataFound`, `TableStatus`/status-color util (`CommonUtils.getStatusColor`), `CommonUtils.keyIntoTitle` for enum→label.

## API client (`apps/job-board-web/src/app/api/endpoints.ts`)

Add a candidate `INTERVIEWS` block (these endpoints are shared with employer but candidate-scoped by token):
```ts
INTERVIEWS: {
  LIST: '/interviews/list',
  UPCOMING: '/interviews/upcoming/list',
  ROUNDS: (applicationId: string) => `/interviews/application/${applicationId}`,
  DETAILS: (id: string) => `/interviews/${id}`,
}
```

## Navbar

Add a **"My Interviews"** tab to the candidate navbar (candidate role only) → `routePaths.candidate.interviews.list`.

## Screen: My Interviews (list)

**Layout**
- Page title "My Interviews".
- **Segmented tabs**: `Upcoming` · `Completed` · `Canceled` · `All`.
- **Filters**: interview type, interview mode, date range (`fromDate`/`toDate`).
- **Search**: single input — if the value is a UUID v4 → send as `jobId`, else send as `jobName`. Debounce ~400 ms. Show a "searching by Job ID" hint when a UUID is detected.
- **Sort**: `sortBy` = `scheduledAt | createdAt`, `sortOrder` = `asc | desc` (default `desc`).
- **List**: interview cards + pagination (`page`/`limit`).

**Segment → request mapping**
| Segment | Request |
|---------|---------|
| Upcoming | `GET /interviews/upcoming/list?page&limit` (endpoint B — scheduled + confirmed + rescheduled, future) |
| Completed | `GET /interviews/list?status=completed` |
| Canceled | `GET /interviews/list?status=canceled` |
| All | `GET /interviews/list` (no status) |

> `/list` takes a **single** `status`. The "Upcoming" tab spans 3 statuses → use endpoint B, not `/list`.

**Interview card (per `data[]` row — Part 1 row shape)**
- Company logo (`companyLogo`, signed URL, null → placeholder), `jobTitle` (bold), `companyName`.
- `status` badge (color map in Enums), `interviewType` chip + `interviewMode` icon.
- `scheduledAt` (format in browser locale, e.g. "Wed, 14 May 2026 · 3:30 PM"), `duration` min.
- If online + `meetingLink` + upcoming → "Join" button (enable ~15 min before `scheduledAt`).
- `rating` stars when present (completed rounds).
- Card click → rounds track page `routePaths.candidate.interviews.rounds(applicationId)`.

**Critical behavior**
- **Reset `page` to 1 on ANY change** of segment, filter, search, or sort.
- Pagination meta from `pagination { totalInterviews, pageCount, currentPage, hasNextPage }`.

**UI states**
- Loading: skeleton cards.
- Empty: "No interviews found" (+ "Try adjusting filters" when filters active).
- Error: retry + show API `message`.

## Screen: Rounds track (per application)

`GET /interviews/application/:applicationId` on mount (endpoint C). Owner-scoped — `403` if not the candidate's application.

**Layout**
- **Header**: `companyLogo`, `jobTitle`, `companyName`, overall `currentStatus` badge, `totalRounds` ("3 rounds").
- **Vertical timeline** of `rounds[]` (already oldest→newest):
  - Each node = one round; connector line; node color by round `status`.
  - Round card: round index ("Round 1"), `interviewType`, `interviewMode`/`interviewTool`, `scheduledAt` + `duration`, `status` badge, `rating` (if any), `location`/`meetingLink`, truncated `interviewerNotes`/`candidateFeedback`/`feedback`.
  - If `rescheduledAt` present → "Rescheduled" hint with that time.
  - Online + upcoming round → "Join" button.
- Candidate may submit feedback per round (optional, if product wants it): `POST /interviews/:id/candidate-feedback` `{ feedback: string }` (candidate role only).

**UI states**
- Loading: header skeleton + ghost timeline nodes.
- Empty (`totalRounds === 0`): "No interviews scheduled yet for this application."
- 403: "You don't have access to this." → back to list.
- 404: "Application not found."

## Web checklist (candidate)

- [ ] Add candidate `interviews` routes to `routePaths.ts` + navbar "My Interviews" tab (role-gated to candidate).
- [ ] Add candidate `INTERVIEWS` endpoints block.
- [ ] List page: segments, filters, UUID-aware debounced search, sort, pagination, **page reset on any change**.
- [ ] Shared `InterviewCard` + status badge color map + type→label map (reuse `CommonUtils`).
- [ ] Rounds track page: header + vertical timeline.
- [ ] Join button (online + upcoming, enable ~15 min before).
- [ ] Empty / loading / error (incl. 403/404) states per screen.
- [ ] Handle signed-URL nulls (logo placeholders).
- [ ] Date formatting in browser timezone (backend stores UTC).

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

---
---

# Part 2 — Employer-side feature additions

Audience: **frontend developers** (web `apps/job-board-web`).
The following three modules describe new UI requirements. All required backend APIs already exist — this section maps every requirement to the exact endpoint, params, payload, response shape, enums, and UI/UX expectations. **No backend changes are needed.**

Base URL: `{{API_BASE}}/api/v1`. All endpoints require `Authorization: Bearer <accessToken>`. Same global response wrapper (`{ data, message, status, statusCode, pagination? }`) as Part 1.

These are **employer / super_employer** screens. Where noted, actions are also permission-gated (the FE already has `permissionUtils.hasPermission(...)`).

---

# Module 1 — Candidate Search

Screens affected:
- Candidate **Search** page — `apps/job-board-web/src/app/(main)/employee/candidates/search/page.tsx`
- Candidate **Search Details** (profile) page — `apps/job-board-web/src/app/(main)/employee/candidates/[profileId]/page.tsx` → renders `ApplicantDetails.tsx`

## 1.1 + 1.2 — "View Contact Details" button with gated reveal

**Goal:** On the candidate search details page, do NOT show the candidate's email / phone by default. Show a **"View Contact Details"** button; reveal the contact info only after the employer clicks it.

**Data source (already returns contact fields — no new API):**

| Need | Endpoint |
|------|----------|
| Candidate profile (from search) | `GET /candidates/:profileId/profile` |
| Candidate profile (from a job applicant) | `GET /applications/:applicationId/candidate-profile` |

Both return the same `CandidateProfileResponse` shape (see `apps/job-board-web/src/app/types/candidateSearch.ts`). The contact fields live under `profile`:

```jsonc
{
  "profile": {
    "userId": "uuid",
    "firstName": "Asha",
    "lastName": "Rao",
    "email": "asha@example.com",   // ← hide until "View Contact Details" clicked
    "phone": "+91 98765 43210",    // ← hide until "View Contact Details" clicked
    "headline": "Senior React Native Engineer",
    "profilePhoto": "https://signed-s3-url | null",
    "city": "Bengaluru", "state": "Karnataka", "country": "India",
    "visibility": "public"
  },
  "application": { /* CandidateProfileApplication | null */ },
  "threadId": "uuid | null",
  "resume": { /* CandidateProfileResume | null */ },
  "videoResume": { "url": "...", "status": "..." } | null,
  "workExperiences": [ ... ], "educationRecords": [ ... ], "skills": [ ... ]
}
```

**FE behavior (this is a frontend-only reveal — the API already returns the values):**
- By default render email/phone masked (e.g. `a••••@•••.com`, `+91 •••••• ••10`) or hidden behind a placeholder row.
- Add a **"View Contact Details"** button. On click → set local `contactRevealed = true` and render the real `profile.email` / `profile.phone`.
- In `ApplicantDetails.tsx` the email is currently printed directly (`{profile?.email}`); gate it behind this reveal state.
- Apply the same gating on **both** entry points (candidate search details + application details — see 3.1, same component).

> There is no per-reveal usage tracking / credit cost for contacts on the backend today (unlike resume download which uses a credit). Reveal is purely a UI gate. If product later wants credit-tracking, that needs a new backend endpoint — out of scope here.

## 1.3 — Interview Alert Cards (carousel) on the Candidate Search page

**Goal:** Add a carousel of the employer's upcoming interviews on the candidate search page for visibility / tracking.

**API:** `GET /interviews/upcoming/list?page=1&limit=10`
- Employer-scoped (returns upcoming interviews across all the employer's jobs).
- Returns `status ∈ {scheduled, confirmed, rescheduled}` with `scheduledAt >= now`.
- Response: `data[]` = interview rows + `pagination { totalInterviews, pageCount, currentPage, hasNextPage }`.

**Interview row fields to render on each alert card** (employer variant of the Part 1 row — relations include candidate + job):
- `candidateName`, `candidateProfilePhoto`
- `jobTitle`
- `interviewType` (→ label, see Part 1 "Type → label"), `interviewMode`
- `scheduledAt` (format in employer locale), `duration` (min)
- `status` (→ badge color, see Part 1 "Suggested badge colors")
- `id` → click card → interview details page `routePaths.employee.interviews.details(id)`

**UI/UX:**
- Carousel layout (horizontal scroll / slider). Place where the static help cards currently sit, or above the results list.
- Empty state: hide the carousel (or "No upcoming interviews").
- Loading: skeleton cards.

---

# Module 2 — Chat

## 2.1 — Voice input (speech-to-text)

**Goal:** Add a mic button to the chat input so the user can dictate a message.

**No backend.** Use the browser **Web Speech API** (`window.SpeechRecognition || window.webkitSpeechRecognition`).

Applies to:
- **Job AI chatbot** — `apps/job-board-web/src/app/components/chats/Chatbot.tsx` (input at the bottom).
- (Optional, same pattern) **Messaging** — `apps/job-board-web/src/app/components/chats/ChatFooter.tsx`.

**FE behavior:**
- Add a mic icon button next to the text input.
- On press → start `SpeechRecognition` (`lang` = user locale, `interimResults` true for live feedback). Append/replace the transcript into the message input state (`setMessage`).
- Toggle recording state (idle / listening). Stop on second press or on `onend`.
- Graceful fallback: if the API is unavailable (unsupported browser), hide the mic button or show a tooltip "Voice input not supported in this browser".
- Mic permission denied → toast / inline hint.

## 2.2 — Job Preview Card (replace raw job URL)

**Goal:** In the **Job AI chatbot** (`Chatbot.tsx`), when the bot response references the job, render a rich **Job Preview Card** instead of a plain job URL/text.

**Context:** The chatbot is always scoped to one job — the component already receives `jobId` as a prop (`<Chatbot jobId={...} />`) and posts to `POST /chat/job` (`{ jobId, message }`), which returns `{ response, messages, suggestions }` (plain text only — no structured job object).

**API to build the card:** `GET /jobs/:id` (use the `jobId` the chatbot already has).

Fields for the card (from job detail response):
```jsonc
{
  "title": "Senior React Native Engineer",
  "company": {
    "name": "TechCorp",
    "logoUrl": "https://signed-s3-url | null"
  }
}
```

**Job Preview Card contents (per requirement):**
- **Company Logo** (`company.logoUrl`, null → placeholder)
- **Job Title** (`title`)
- **Company Name** (`company.name`)
- **View Job** button → navigate to the job details route `/jobs/:id`

**FE behavior:**
- Fetch the job once (when the chatbot opens / on mount) and render the preview card pinned at the top of the chat (or as a card bubble) instead of any raw URL in the bot text.
- If the bot text contains a job URL, strip/replace it with the card.

---

# Module 3 — Application & Interview

Screens affected:
- **Application Details** (a job's applicant) → `ApplicantDetails.tsx` (shared with candidate profile).
- **Interview Details** page → `apps/job-board-web/src/app/(main)/employee/interviews/[id]/InterviewDetails.tsx`.

## 3.1 + 3.2 — "View Contact Details" button + Contact Details Modal with "Schedule Interview" action

**3.1** Same gated reveal as 1.1/1.2, but on the **Application Details** page (same `ApplicantDetails.tsx` component, application flow). Contact fields come from `GET /applications/:applicationId/candidate-profile` → `profile.email` / `profile.phone`.

**3.2 Contact Details Modal:** clicking "View Contact Details" opens a modal showing:
- `profile.email`, `profile.phone` (copy-to-clipboard helpers optional)
- Candidate name / photo / headline
- An **"Schedule Interview"** action inside the modal.

**Schedule Interview action → `POST /interviews`** (employer, `interviews:create` permission).

Request body (`ScheduleInterviewDto`):
```jsonc
{
  "applicationId": "uuid",        // required — from application.applicationId
  "type": "technical",            // required — InterviewType
  "interviewMode": "online",      // optional, default "online"  (online | offline)
  "interviewTool": "zoom",        // optional (zoom | teams | phone | other); zoom/teams auto-generate the link
  "scheduledAt": "2026-07-01T10:30:00.000Z", // required, ISO 8601, future
  "duration": 60,                 // optional, default 60 (min 15, max 480)
  "location": "Office address",   // required when interviewMode = offline
  "meetingLink": "https://...",   // required only when interviewTool = other
  "timezone": "Asia/Kolkata",     // optional, default Asia/Kolkata
  "interviewerIds": ["uuid"]      // optional
}
```
Response: created interview row. Errors: 400 (bad date/enum), 403 (employer profile / permission), 404 (application not found).

> The existing "Schedule Interview" button (navigates to a dedicated schedule page via `routePaths.employee.jobs.scheduleInterview(applicationId)`) can be reused from inside the modal instead of an inline form — either is acceptable.

## 3.3 — Show Interview Round information on the Interview Details page

**Goal:** On the interview details page, display all rounds of that application's interview process (currently the page shows only the single interview).

**API:** `GET /interviews/application/:applicationId`
- `applicationId` comes from the loaded interview (`interview.applicationId`).
- Owner-scoped (employer must own the job). Not paginated.

**Response `data`:**
```jsonc
{
  "application": {
    "id": "uuid",
    "jobId": "uuid | null",
    "jobTitle": "string | null",
    "companyName": "string | null",
    "companyLogo": "https://signed-s3-url | null",
    "candidateId": "uuid | null",
    "candidateName": "string | null",
    "currentStatus": "interview_scheduled"  // ApplicationStatus
  },
  "rounds": [ /* interview-row shape, ordered oldest-first */ ],
  "totalRounds": 3
}
```

**UI/UX:** vertical timeline / list of `rounds[]` (oldest → newest). Per round show: round index ("Round 1"), `interviewType`, `interviewMode`/`interviewTool`, `scheduledAt` + `duration`, `status` badge, `rating` (1–5 stars, if present), truncated `interviewerNotes`/`feedback`. Highlight the round currently being viewed. If `rescheduledAt` present → show "Rescheduled" hint.

## 3.4 — Action buttons on the Interview Details page: Reschedule / Cancel / Complete (with notes)

These already exist on the interview **list table** (`InterviewListTable.tsx`) via reusable dialogs — reuse the same dialogs on the **details page**:
- `apps/job-board-web/src/app/components/dialogs/RescheduleInterviewDialog.tsx`
- `apps/job-board-web/src/app/components/dialogs/CancelInterviewDialog.tsx`
- `apps/job-board-web/src/app/components/dialogs/CompleteInterviewDialog.tsx`

All three are gated by `permissionUtils.hasPermission('interviews:update')`.

| Action | Endpoint | Body | Show when |
|--------|----------|------|-----------|
| **Reschedule** | `PUT /interviews/:id` | `{ scheduledAt: ISO, status: "rescheduled", reason?, duration?, interviewTool?, meetingLink?, location?, timezone? }` | `scheduledAt`/`rescheduledAt` is in the future |
| **Cancel** | `POST /interviews/:id/cancel` | `{ reason?: string }` | status ∈ {scheduled, rescheduled} and scheduledAt is in the future |
| **Complete** (with notes) | `POST /interviews/:id/complete` | `{ rating?: 1-5, notes?: string }` | status ∈ {scheduled, rescheduled} and scheduledAt is now/past |

**Effects (already handled by backend — for FE awareness):**
- Reschedule → interview `status=rescheduled`, sets `rescheduledAt`; application → `interview_rescheduled` (+ history entry); notifications sent.
- Cancel → interview `status=canceled`; application → `interview_cancelled` (+ history); deletes auto-generated Zoom/Teams meeting; notifications sent.
- Complete → interview `status=completed`, stores `rating` + `interviewerNotes`; application → `interview_completed` (+ history).

After any action, re-fetch `GET /interviews/:id` (and the rounds list from 3.3) to refresh the page.

## 3.5 — "Add Interview" button after completion (schedule next round)

**Goal:** Once an interview is marked **completed**, show an **"Add Interview"** button to schedule the next round.

**Show when:** `interview.status === "completed"` (or `application.currentStatus === "interview_completed"`).

**Action:** same as 3.2 → `POST /interviews` with the **same `applicationId`** (a new round on the same application). Pre-fill nothing except `applicationId`; let the employer pick `type`, `scheduledAt`, etc. Or reuse the existing schedule page `routePaths.employee.jobs.scheduleInterview(applicationId)`.

After creating, the new round appears in the 3.3 rounds timeline.

---

# Enums (additions reference)

`InterviewType`, `InterviewMode`, `InterviewTool`, `InterviewStatus`, `ApplicationStatus`, badge colors, and type→label maps are all defined in Part 1 ("Enums"). Reuse them for Modules 1 and 3.

# Endpoint quick-reference (Part 2)

| Requirement | Method & Endpoint |
|-------------|-------------------|
| 1.1/1.2 contact (search) | `GET /candidates/:profileId/profile` → `profile.email`, `profile.phone` |
| 1.3 interview alert carousel | `GET /interviews/upcoming/list?page&limit` |
| 2.1 voice input | — (Web Speech API, no backend) |
| 2.2 job preview card | `GET /jobs/:id` → `title`, `company.name`, `company.logoUrl` |
| 3.1/3.2 contact (application) | `GET /applications/:applicationId/candidate-profile` → `profile.email`, `profile.phone` |
| 3.2/3.5 schedule interview | `POST /interviews` (`ScheduleInterviewDto`) |
| 3.3 round info | `GET /interviews/application/:applicationId` |
| 3.4 reschedule | `PUT /interviews/:id` |
| 3.4 cancel | `POST /interviews/:id/cancel` |
| 3.4 complete (notes) | `POST /interviews/:id/complete` |
