# Frontend Implementation Prompt — Per-Application Chat Threads

> **How to use this file:** This is a ready-to-run prompt for an AI code editor (Cursor, Copilot,
> Claude Code, etc.). Paste it as the task. It targets **both** the Next.js web app
> (`apps/job-board-web`) and the **React Native** app. Implement phase by phase, in order, and do not
> start a phase until the previous one's acceptance criteria pass. No backend changes are needed —
> the backend is already done.

---

## ROLE

You are a senior frontend engineer. You are updating the **Messaging / Chat** feature to support
**one chat thread per job application**. The backend already changed. Your job is to adapt the
frontend data layer and UI to the new contract, remove a deprecated field, and add new inbox
features. Keep all other messaging behaviour (attachments, read receipts, realtime sockets,
presence) working exactly as before.

---

## BACKGROUND — WHAT CHANGED ON THE BACKEND

**Before:** one chat thread per candidate + company. All jobs shared a single chat box.
**Now:** one chat thread per **job application**. If a candidate applies to 5 jobs at the same
company, there are 5 separate, isolated threads.

Consequences you must handle:

1. The inbox can now contain **multiple threads for the same candidate↔company**, one per job.
2. Each thread now carries its **own job** (`jobId`, `jobTitle`, `jobStatus`).
3. A company can post **multiple jobs with the same title** (e.g. "MERN Stack Developer" for
   Bangalore, Hyderabad, Kochi). Titles repeat, so you must **disambiguate by `jobId`** using a
   short code.
4. The old `latestApplication` object is **removed** from responses. Stop reading it.
5. New employer-only features: filter inbox by job, "my jobs only" filter, and an `isOwnJob` flag.
6. Whether a chat can accept new messages is now decided **per thread** by the backend. The frontend
   must handle a `403` on send and switch that thread to read-only.

---

## GLOBAL CONSTANTS & RULES (apply everywhere)

- **API base URL:** all calls go through the API Gateway (e.g. `https://<gateway-host>`), same base
  the app already uses for messaging. Every request needs `Authorization: Bearer <accessToken>`.
- **Short code rule (job id):** to disambiguate duplicate job titles, render a short code from
  `jobId`:
  - Remove dashes, take the **last 12 characters**, uppercase.
  - Example: `97dc7806-6c19-4b87-a914-bc2927bde54d` → `BC2927BDE54D`.
  - Display format on cards/headers: `"<jobTitle> #<SHORTCODE>"` →
    `"MERN Stack Developer #BC2927BDE54D"`.
  - Only show the short code when needed (always safe to show; required when titles can repeat).
- **Roles:** each thread participant has `role: "candidate" | "employer"`. The "chat partner" is the
  participant whose role is the opposite of the current user.
- **Realtime:** keep the existing Socket.io connection and events unchanged. More threads now exist,
  but socket logic (rooms keyed by threadId) does not change.

---

## API CONTRACT (authoritative — build the data layer to match exactly)

### A. Start or continue a conversation
`POST /messages/threads`

Payload:
```json
{
  "recipientId": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "applicationId": "d4e5f6a7-b8c9-0123-defa-456789012345",
  "body": "Hi, regarding the MERN Stack Developer (Bangalore) role..."
}
```
- `applicationId` is **required** and decides which thread the message belongs to.
- Same candidate + same company but **different `applicationId`** → creates a **new** thread.

Response `201`:
```json
{
  "message": "Thread created successfully",
  "data": {
    "thread": { "id": "e5f6a7b8-...", "applicationId": "d4e5f6a7-...", "participants": [ ... ], "lastMessageAt": "2026-06-05T10:30:00.000Z", "isArchived": false, "createdAt": "..." },
    "message": { "id": "f6a7b8c9-...", "body": "...", "status": "sent" },
    "isNew": true
  }
}
```
- Use `data.thread.id` for the chat screen. `isNew` tells you whether a new thread was created.

Error `403` (chat not allowed for this application):
```json
{ "statusCode": 403, "message": "You can start conversation once the employer shortlists your application." }
```

---

### B. Inbox list (both candidate and employer)
`GET /messages/threads`

Query params:
| Param | Who | Meaning |
|---|---|---|
| `page` | both | default 1 |
| `limit` | both | default 20 |
| `archived` | both | `true` = only archived, omit = active |
| `jobId` | employer | filter to one job (full UUID) |
| `ownJobsOnly` | employer | `true` = only threads for jobs this recruiter posted. **Omit the param entirely when not filtering — do not send `false`.** |

Response `200`:
```json
{
  "message": "Threads fetched successfully",
  "data": [
    {
      "id": "e5f6a7b8-...",
      "participants": [
        { "id": "a1b2c3d4-...", "firstName": "Jan", "lastName": "Mayer", "role": "employer", "companyName": "Acme Corp", "companyLogo": "https://.../acme.png", "profilePhoto": "https://...", "phone": "+91...", "isOnline": true },
        { "id": "b2c3d4e5-...", "firstName": "Ahmed", "lastName": "Anjims", "role": "candidate", "companyName": null, "companyLogo": null, "profilePhoto": null, "phone": "+91...", "isOnline": false }
      ],
      "applicationId": "d4e5f6a7-...",
      "jobId": "97dc7806-6c19-4b87-a914-bc2927bde54d",
      "jobTitle": "MERN Stack Developer",
      "jobStatus": "active",
      "isOwnJob": true,
      "lastMessage": { "id": "f6a7b8c9-...", "body": "We want to invite you...", "senderId": "b2c3d4e5-...", "createdAt": "2026-06-05T10:30:00.000Z", "status": "delivered" },
      "lastMessageAt": "2026-06-05T10:30:00.000Z",
      "isArchived": false,
      "createdAt": "2026-06-04T09:00:00.000Z",
      "unreadCount": 3
    }
  ],
  "pagination": { "totalThread": 12, "pageCount": 1, "currentPage": 1, "hasNextPage": false }
}
```

Field notes:
- `jobId`, `jobTitle`, `jobStatus` — the job this thread belongs to. `jobTitle` may repeat; pair with `jobId`.
- `isOwnJob` — employer view only: `true` if the viewing recruiter posted this job. Always `false` for candidates.
- `unreadCount` — number badge.
- `lastMessage.body` + `lastMessageAt` — preview + timestamp.
- **`latestApplication` no longer exists. Remove all reads of it.**

---

### C. Employer job-filter dropdown
`GET /messages/threads/job-filters`

Response `200`:
```json
{
  "message": "Job filters fetched successfully",
  "data": [
    { "jobId": "97dc7806-6c19-4b87-a914-bc2927bde54d", "jobTitle": "MERN Stack Developer", "jobStatus": "active" },
    { "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", "jobTitle": "MERN Stack Developer", "jobStatus": "closed" }
  ]
}
```
- Use to populate the "filter by job" dropdown. Render each option as `"<jobTitle> #<SHORTCODE>"`.
- Candidate callers get `{ "data": [] }` — candidates have **no** job filter.

---

### D. Messages inside a thread
`GET /messages/threads/{threadId}/messages?page=1&limit=50&unreadOnly=false`

Response `200`:
```json
{
  "message": "Messages fetched successfully",
  "data": {
    "participants": {
      "self": { "id": "a1b2c3d4-...", "firstName": "Jan", "lastName": "Mayer", "phone": "+91...", "profilePhoto": null },
      "opponent": { "id": "b2c3d4e5-...", "firstName": "Ahmed", "lastName": "Anjims", "phone": "+91...", "profilePhoto": "https://..." }
    },
    "jobId": "97dc7806-6c19-4b87-a914-bc2927bde54d",
    "jobTitle": "MERN Stack Developer",
    "jobStatus": "active",
    "isOwnJob": true,
    "messages": [
      { "id": "aaa11111-...", "threadId": "e5f6a7b8-...", "senderId": "b2c3d4e5-...", "recipientId": "a1b2c3d4-...", "body": "We are arriving today...", "attachments": null, "status": "read", "isRead": true, "readAt": "...", "deliveredAt": "...", "createdAt": "...", "isOwn": false }
    ]
  },
  "pagination": { "totalMessage": 8, "pageCount": 1, "currentPage": 1, "hasNextPage": false }
}
```
- Use `jobId` + `jobTitle` (+ short code) and `jobStatus` to render the chat header sub-line.
- `isOwn` aligns bubbles (right if true, left if false).
- `latestApplication` removed here too.

---

### E. Send a message
`POST /messages/threads/{threadId}/messages`

Payload:
```json
{ "body": "Sounds good, see you then.", "attachments": [ { "name": "cv.pdf", "url": "<key-or-url>" } ] }
```
- `attachments` optional (existing upload flow via `POST /messages/attachments/upload-url` unchanged).

Success `201`: returns the created message object.

**Important — per-thread read-only:** if this thread's application is `rejected`, `withdrawn`, or
`offer_rejected`, the backend returns `403`:
```json
{ "statusCode": 403, "message": "Chat disabled because the application was withdrawn." }
```
On `403`: disable the composer for that thread and show the returned `message` as an inline banner.
Do **not** crash or retry. Other threads remain writable.

---

### F. Unchanged endpoints (do not modify behaviour)
- `POST /messages/mark-read` — body `{ "messageIds": ["..."] }`
- `POST /messages/threads/{threadId}/mark-read` — mark whole thread read
- `GET /messages/unread/count` — global unread badge
- `POST /messages/attachments/upload-url` — attachment upload
- `GET /messages/threads/{threadId}` — single thread
- `PUT /messages/threads/{threadId}` — archive/unarchive (`{ "isArchived": true }`)
- `DELETE /messages/threads/{threadId}` — soft-delete (archive)

---

## IMPLEMENTATION PHASES

Do them in order. After each phase, self-check against its **Acceptance criteria** before moving on.

### PHASE 0 — Audit & types (no UI change)
1. Find every place the messaging types/models are defined (TS interfaces, RN types, API client
   functions, state stores).
2. Locate every usage of `latestApplication` across the messaging feature (inbox, chat header,
   composer enable/disable logic).
3. Update the thread/message type definitions to the new contract: add `jobId`, `jobTitle`,
   `jobStatus`, `isOwnJob` to the thread/inbox model; add `jobId`, `jobTitle`, `jobStatus`,
   `isOwnJob` to the messages-response model. Mark `latestApplication` as removed.

**Acceptance:** project compiles with the new types; a list of all `latestApplication` usages is
produced for Phase 4.

---

### PHASE 1 — API layer
1. Update the inbox list API function to accept optional `jobId`, `ownJobsOnly`, `archived`, `page`,
   `limit`. **Only attach `ownJobsOnly` when it is `true`** (never send `false`).
2. Add a new API function for `GET /messages/threads/job-filters`.
3. Confirm the messages API function maps the new `data.jobId/jobTitle/jobStatus/isOwnJob`.
4. Add a shared helper `formatJobShortCode(jobId)` implementing the short-code rule, and a helper
   `formatJobLabel(jobTitle, jobId)` → `"<title> #<code>"`.

**Acceptance:** API functions return typed data with the new fields; `job-filters` function works;
short-code helper returns `BC2927BDE54D` for the sample UUID.

---

### PHASE 2 — Inbox list UI (both sides)
Update the chat list cards.

**Employer card must show:** candidate name, **job label** (`title #shortcode`), `jobStatus`
(e.g. a small "Closed"/"Active" chip), last message preview, last message timestamp, unread count.
Optionally a subtle "Your job" / "Team" marker driven by `isOwnJob`.

**Candidate card must show:** company name (+ logo via existing `companyLogo`), **job label**
(`title #shortcode`), `jobStatus`, last message preview, last message timestamp, **unread count
badge**.

Rules:
- The same candidate↔company may now appear multiple times (once per job) — this is expected; render
  each as its own card.
- Use the participant with the **opposite role** for the name/avatar.
- Keep existing pagination / infinite scroll.

**Acceptance:** applying to 3 same-title jobs shows 3 distinct cards, each with a different short
code; candidate sees unread badge; timestamps and previews correct.

---

### PHASE 3 — Chat screen
1. In the chat header, show the chat partner (name, avatar, online status) **and** a sub-line with
   the **job label** (`title #shortcode`) + `jobStatus`.
2. On send `403`: switch the composer to read-only for that thread and show the `message` text as an
   inline banner ("Chat disabled because the application was withdrawn."). Re-enable only if a later
   successful send/load indicates the thread is writable again.
3. Everything else (bubbles via `isOwn`, attachments, read receipts, realtime) stays as-is.

**Acceptance:** header shows correct job + short code; sending in a withdrawn/rejected thread shows
the banner and disables the composer without errors; a normal thread still sends fine.

---

### PHASE 4 — Remove `latestApplication`
1. Delete every read of `latestApplication` found in Phase 0.
2. Replace any UI that used `latestApplication.jobTitle` with the thread's own `jobTitle`/`jobId`.
3. Replace any composer enable/disable logic that used `latestApplication.status` with the Phase 3
   `403`-driven read-only behaviour.

**Acceptance:** no references to `latestApplication` remain; nothing renders `undefined`.

---

### PHASE 5 — Employer job filter (web + RN)
1. On the employer inbox, add a "Filter by job" dropdown populated from
   `GET /messages/threads/job-filters`. Each option label = `formatJobLabel(jobTitle, jobId)`.
   Selecting one calls the inbox list with `?jobId=<selected>`. A "All jobs" option clears it.
2. Add a "My jobs only" toggle → calls the inbox list with `?ownJobsOnly=true` (omit when off).
3. Both filters compose with pagination and with each other.
4. Candidate inbox: **no** filter UI. Just ensure the job label shows on each card (from Phase 2).

**Acceptance:** selecting a job shows only that job's threads; "My jobs only" shows only `isOwnJob:
true` threads; clearing restores the full list; candidate has no filter UI.

---

## PLATFORM NOTES

- **Next.js web (`apps/job-board-web`):** follow existing patterns — Zustand store for messaging
  state, React Hook Form for the composer, existing API client. Reuse the existing socket setup.
- **React Native:** mirror the same data layer and the same phases. Use the platform's list
  component for the inbox; the chat card and header must show the same fields (job label, status,
  unread badge). The short-code + job-label helpers should be shared logic, not duplicated.
- Keep both apps visually consistent with their existing design system; this change is about data
  and a few new UI elements, not a redesign.

---

## DEFINITION OF DONE (all phases)

- One thread per application is reflected: multiple cards for multi-job candidates.
- Every card and chat header shows job title + short code + status.
- Candidate cards show the unread badge.
- Employer inbox has job-filter dropdown + "My jobs only" toggle.
- `latestApplication` fully removed; composer read-only is driven by send `403`.
- Attachments, read receipts, presence, and realtime still work unchanged.
- No `undefined`/crash on any messaging screen; both web and RN build clean.
