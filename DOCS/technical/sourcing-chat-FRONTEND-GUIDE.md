# Sourcing Chat — Frontend Integration Guide (Web + React Native)

> **Feature**: Employers can now message a candidate found via **Candidate Search** before any application exists ("sourcing thread"). Backend is live behind `POST /messages/threads` — `applicationId` is now optional.
>
> **Audience**: Web (Next.js job-board + employer portal) and React Native developers.
> **Backend status**: merged on `krish/enhancement_june`; requires `db:push` + messaging-service / user-service redeploy before testing against dev.
> **Related docs**: `candidate-profile-view-FRONTEND-GUIDE.md` (profile page), `candidate-profile-view-implementation.md` (backend design).

---

## 1. What changed (TL;DR)

| | Old flow (application thread — unchanged) | New flow (sourcing thread) |
|---|---|---|
| **Trigger** | Candidate applied to a job; chat opens from the application | Employer finds candidate via search — no application |
| **`POST /messages/threads` body** | `recipientId` + `applicationId` + `body` | `recipientId` + `body` (+ optional `jobId`) |
| **Who can start** | Employer (active statuses) or candidate (after shortlisted) | **Employer only** — candidate gets 403 |
| **Precondition** | Application must exist between candidate and employer's job | Candidate profile public, or private + applied to your company |
| **Status gating** | Blocked for `rejected` / `withdrawn` / `offer_rejected` | Same rule: 403 if candidate applied to your company and **every** application is rejected/withdrawn/offer_rejected. Never applied → allowed. |
| **Thread uniqueness** | One per application (2 applications = 2 threads) | One per employer↔candidate pair per company |
| **`applicationId` on thread** | Set | `null` |
| **`jobTitle` in thread list** | From the application's job | Only if employer passed `jobId`, else `null` |
| **Candidate reply** | Per status rules | Always allowed |
| **Cost** | Free | Free, no subscription |
| **Candidate later applies** | — | A separate application thread is created as usual; threads never merge |

**One golden rule:** if an application context exists, ALWAYS pass `applicationId`. Omitting it no longer returns 400 — it silently creates a different (sourcing) thread. Full list of wrong calls and their side effects: **section 2.4** — read it before wiring anything.

---

## 2. API contract

### 2.1 Start / continue a conversation

`POST /api/v1/messages/threads` (via API Gateway, port 3000)

```jsonc
// Sourcing (from candidate search — NEW)
{
  "recipientId": "<profile.userId>",   // candidate's users.id — NOT profileId (backend resolves profileId too, but send userId)
  "body": "Hi, I found your profile and would like to discuss an opening.",
  "jobId": "<uuid>"                    // OPTIONAL — attaches job context; must be a job posted by you / your company
}

// Application context (EXISTING — unchanged)
{
  "recipientId": "<userId>",
  "applicationId": "<uuid>",
  "body": "..."
}
```

**Response (201)** — same shape for both kinds:

```jsonc
{
  "message": "Thread created successfully",
  "data": {
    "thread": {
      "id": "uuid",                    // ← store this; use for all subsequent chat calls
      "participants": [ /* enriched: id, firstName, lastName, phone, profilePhoto, companyName, companyLogo, isOnline, role */ ],
      "applicationId": null,           // null = sourcing thread
      "companyId": "uuid | null",
      "jobId": "uuid | null",
      "lastMessageAt": "2026-06-10T...",
      "isArchived": false,
      "createdAt": "2026-06-10T..."
    },
    "message": { /* the message you just sent */ },
    "isNew": true                      // false = existing thread reused (safe to call repeatedly)
  }
}
```

### 2.2 Where `threadId` comes from (profile page)

`GET /api/v1/candidates/:profileId/profile` response now has a **top-level** `threadId`:

```jsonc
{
  "profile": { /* ... */ },
  "application": { /* ... or null */ },
  "resume": { /* ... or null */ },
  "videoResume": { /* ... or null */ },
  "threadId": "uuid | null"            // YOUR application thread, else YOUR direct (sourcing) thread, else null
}
```

- `threadId != null` → **you** have a conversation with this candidate → chat icon opens that thread.
- `threadId == null` → **you** have no conversation yet → "Message" button; first send goes through `POST /messages/threads`.
- `threadId` is always scoped to the logged-in employer user. A colleague's thread with this candidate is **never** returned here, even when `application` belongs to a colleague's job (the `application` block is company-level; `threadId` is not).

**Colleague rule (multi-recruiter companies):** if you send `applicationId` but the application thread was started by a colleague (you are not a participant), the backend does NOT put your message in their thread. It silently routes you to **your own direct (sourcing) thread** with the candidate — `isNew: true` on first send. To continue a colleague's conversation instead, open it from the inbox (visible with `company-chat:read` permission) and use `POST /threads/{threadId}/messages`.

### 2.3 Errors (sourcing path)

| Status | When | Required UI handling |
|--------|------|----------------------|
| `400` | Invalid UUID in body | Treat as bug; log |
| `401` | Token missing/expired | Standard re-auth |
| `403` | Sender is a candidate | Never show the no-application "Message" entry point on the candidate side |
| `403` | `jobId` doesn't belong to you / your company | Fix the job picker; don't retry |
| `403` | Candidate applied to your company and every application is rejected/withdrawn/offer_rejected | Show "Chat not available for this candidate"; disable the button |
| `404` | Candidate not found, OR private profile that never applied to your company | "Candidate not available" |

The two 403 reasons are distinguishable by the `message` field:
- `"Candidates can start a conversation only from a job application."`
- `"Job does not belong to you or your company"`
- `"Chat is not allowed for rejected, withdrawn, or offer rejected applications."`

### 2.4 ⚠️ Wrong calls to avoid — payload mistakes and their side effects

Read this table before wiring anything. The most dangerous mistakes do NOT return an error — they silently do the wrong thing.

| # | Wrong call | What actually happens | Severity | How to avoid |
|---|-----------|----------------------|----------|--------------|
| 1 | **Omitting `applicationId` when an application exists** (e.g. variable is `undefined` because of a missing null-check, wrong destructuring, stale state) | **NO error.** Server silently creates/reuses a *sourcing* thread. The message lands in a different thread than the applicant chat; recruiter sees two conversations; application chat history splits. | 🔴 Worst case — invisible | Centralize thread creation in ONE api helper that receives the `application` object (not a raw id) and decides the payload itself. Never build this payload inline in components. |
| 2 | **Sending `applicationId: null` or `""` explicitly** | `null`/`""` fails `@IsUUID` → 400. But `undefined`/absent key = sourcing path (case 1). | 🟡 | Spread conditionally: `...(application ? { applicationId: application.applicationId } : {})`. Never pass the key with a falsy value. |
| 3 | **`recipientId` = wrong candidate's userId** (list index mismatch, stale card data) | Sourcing path: thread created with the WRONG candidate — message goes to a stranger. No error if their profile is public. | 🔴 Invisible | Take `recipientId` only from the profile response you are currently rendering (`data.profile.userId`), never from list state. |
| 4 | **`recipientId` = `profileId` instead of `userId`** | Backend resolves profileId → userId as a fallback, so it works today. Do not rely on it — it's a compatibility shim. | 🟢 | Send `profile.userId`. |
| 5 | **Passing an `applicationId` that belongs to a different candidate than `recipientId`** | 403 `"No application exists between you and this user."` | 🟡 Loud | Keep `recipientId` and `applicationId` from the SAME profile/application response object. |
| 6 | **Passing `jobId` together with `applicationId`** | `jobId` is silently ignored (job derives from the application). Not harmful, but signals confused call-site code. | 🟢 | Send `jobId` only when `applicationId` is absent. |
| 7 | **`jobId` of another company's job** (hardcoded test id, wrong picker source) | 403 `"Job does not belong to you or your company"`. | 🟡 Loud | Job picker lists only the logged-in recruiter's/company's jobs. |
| 8 | **Candidate app calling without `applicationId`** | 403. No thread created. | 🟡 Loud | Candidate side: the only entry point to start a chat is from an application. Never expose a generic "message employer" button. |
| 9 | **Retry loop on 403/404** | Same error forever; sourcing rules are not transient. | 🟡 | Treat all 4xx from this endpoint as terminal — show UI state, don't retry. |
| 10 | **Calling create-thread for every message** instead of `POST /threads/{id}/messages` | Works (thread reused) but skips per-thread status checks and bloats payloads; also re-runs the gating queries on every send. | 🟡 | Use create-thread ONCE to obtain `thread.id`, then switch to `POST /threads/{threadId}/messages`. |

**The pattern that prevents cases 1–6 — one helper, no inline payloads:**

```ts
// chat-api.ts — the ONLY place allowed to call POST /messages/threads
export function startConversation(opts: {
  candidate: { userId: string };               // from the profile response being rendered
  application?: { applicationId: string } | null;
  job?: { id: string } | null;                 // sourcing context only
  body: string;
}) {
  return api.post(MESSAGES.CREATE_THREAD, {
    recipientId: opts.candidate.userId,
    body: opts.body,
    ...(opts.application
      ? { applicationId: opts.application.applicationId }   // application thread
      : opts.job
        ? { jobId: opts.job.id }                            // sourcing with job context
        : {}),                                              // pure sourcing
  });
}
```

---

## 3. Implementation plan — Web (employer portal)

### Step 1 — endpoints

```ts
// endpoints.ts
MESSAGES: {
  CREATE_THREAD: `/messages/threads`,          // body: { recipientId, body, applicationId?, jobId? }
  THREAD_MESSAGES: (threadId: string) => `/messages/threads/${threadId}/messages`,
},
```

### Step 2 — types

```ts
interface CreateThreadRequest {
  recipientId: string;
  body: string;
  applicationId?: string; // ALWAYS set when an application context exists
  jobId?: string;         // sourcing only — optional job context
}

interface CreateThreadResponse {
  message: string;
  data: {
    thread: {
      id: string;
      applicationId: string | null;
      companyId: string | null;
      jobId: string | null;
      participants: ThreadParticipant[];
      lastMessageAt: string;
      isArchived: boolean;
      createdAt: string;
    };
    message: ChatMessage;
    isNew: boolean;
  };
}
```

### Step 3 — candidate search card / profile page button

Pseudo-logic (both `CandidateCard` and the profile page header):

```tsx
// profile page already fetched GET /candidates/:profileId/profile
if (data.threadId) {
  // existing conversation
  <ChatButton onClick={() => router.push(`/messages?threadId=${data.threadId}`)} />
} else {
  // no conversation yet — open a "first message" composer (modal or inline)
  <MessageButton onClick={openComposer} />
}

async function onSendFirstMessage(text: string) {
  const res = await api.post(MESSAGES.CREATE_THREAD, {
    recipientId: data.profile.userId,           // userId, not profileId
    body: text,
    ...(data.application ? { applicationId: data.application.applicationId } : {}),
    // optional: jobId from a job-picker dropdown when no application
  });
  router.push(`/messages?threadId=${res.data.data.thread.id}`);
}
```

Key points:
- **Branch on `data.application`**: non-null → pass `applicationId` (application thread). Null → omit it (sourcing thread).
- `CandidateCard.tsx:144,153` — the disabled chat/message buttons can now be enabled for search results.
- Handle the rejected-candidate 403 by disabling the button with a tooltip after the first failure (or pre-check: `application?.status` in the profile response).

### Step 4 — Messages inbox (thread list)

Sourcing threads appear in the normal `GET /messages/threads` list with:
- `applicationId: null`
- `jobTitle: null` (unless employer attached a `jobId`)

Required changes:
1. **Null-guard `jobTitle`** on the thread card — render the counterpart participant's name; for the candidate side render `companyName` instead of the job title. Do NOT render "null" or crash.
2. **Do not navigate to an application page from a thread when `applicationId` is null** — hide/disable any "View application" affordance on those cards.
3. Optional: show a small "Sourced" / "Direct" badge when `applicationId == null` so recruiters can tell outreach apart from applicant chats.
4. `?ownJobsOnly=true` now also returns threads the recruiter created (their sourcing outreach) — no frontend change needed, just expect them.
5. Default list (no filters) returns ALL chats — keep client-side filtering by jobTitle / jobId / candidate name working against nullable `jobTitle`.

### Step 5 — chat screen

`GET/POST /messages/threads/:id/messages`, read receipts — all identical for sourcing threads. Real-time and alignment rules (apply to ALL threads, not just sourcing):

1. **Align bubbles by `isOwn`, never by `senderId === myUserId`.** `isOwn` is side-based: for employer viewers the backend marks every employer-side message (including a colleague's message sent into the thread via company-chat permission) as `isOwn: true`; only the candidate's messages are `isOwn: false`. Comparing `senderId` to the logged-in user puts colleague messages on the candidate's side and, for company-level viewers of a thread they don't participate in, puts EVERYTHING on the left.
2. **`POST /threads/:id/messages` (REST) now broadcasts over WebSocket** — `new_message` goes to the `thread:{threadId}` room and to the recipient's socket, exactly like the socket `send_message` event. The REST response body is the enriched message (signed attachments array, `sender`/`recipient` profiles, `isOwn: true`) — append it directly, no refetch needed.
3. **Emit `join_thread {threadId}` when the chat screen opens** and `leave_thread` on close. Room membership is lost on socket reconnect — re-join on the socket `connect` event. The room is the only delivery path for company-level viewers (they are never the message recipient).
4. **Socket `new_message` payloads have no `isOwn`** — derive it client-side: employer viewer → `sender.role !== 'candidate'`; candidate viewer → `senderId === myUserId`. Dedupe appended messages by `id` (the sender receives their own message back via the thread room).

---

## 4. Implementation plan — React Native

### Step 1 — same API layer additions as Web (endpoints + types above).

### Step 2 — candidate profile screen

```tsx
const { data } = useCandidateProfile(profileId); // GET /candidates/:profileId/profile

// header action
data.threadId
  ? navigation.navigate('ChatScreen', { threadId: data.threadId })
  : setComposerVisible(true); // bottom-sheet composer for the first message

const sendFirstMessage = async (text: string) => {
  const res = await api.post('/messages/threads', {
    recipientId: data.profile.userId,
    body: text,
    ...(data.application ? { applicationId: data.application.applicationId } : {}),
  });
  navigation.replace('ChatScreen', { threadId: res.data.data.thread.id });
};
```

- Use `navigation.replace` (not `push`) after the first send so back returns to the profile, not the composer.
- Calling create-thread twice is safe (`isNew: false`, same thread) — no double-thread risk on retry/double-tap, but still debounce the send button.

### Step 3 — messages tab (thread list)

Same four guards as Web step 4: null `jobTitle`, null `applicationId` (no application navigation), optional "Sourced" badge, nullable-safe local search/filter.

Candidate app additionally:
- Sourcing threads just appear in the candidate's inbox — they can read and reply with zero changes.
- Thread card: when `jobTitle` is null, show the employer participant's `companyName` (fallback: first+last name).
- Do NOT show any "start chat" entry point to candidates outside an application — server rejects it with 403.

### Step 4 — push notifications

Message notifications for sourcing threads flow through the existing message pipeline. If your notification deep-link handler assumes an `applicationId` in the payload, make it fall back to `threadId`-only navigation.

---

## 5. Edge cases & gotchas (read before coding)

1. **Silent kind-switch**: omitting `applicationId` is now a valid request, not a 400. A bug that drops `applicationId` creates a sourcing thread and the message lands outside the application context. Centralize thread creation in ONE api helper that takes the application object and decides.
2. **Two threads per candidate are normal**: an employer who sourced a candidate that later applies will have BOTH a sourcing thread and an application thread with the same person. Render both; the job title (or its absence) is the differentiator.
3. **`isNew: false` on first click**: a colleague from the same company may have already sourced this candidate — different recruiter = different thread, but the SAME recruiter re-clicking gets the existing thread with history. Don't treat `isNew: false` as an error.
4. **Rejected candidates**: button may look enabled (profile is viewable — viewing is free) but POST returns 403. Handle it gracefully; ideally check `application?.status` from the profile response to pre-disable.
5. **`jobId` is optional, not required**: don't block the composer on a job selection. If you add a job picker, only list jobs posted by the logged-in recruiter/company (server enforces it with 403).
6. **Archived sourcing threads**: re-sending to an archived sourcing thread reuses it but does NOT unarchive it. If the user can't find the chat after sending, check `?archived=true`.
7. **Colleague's application thread is never adopted** (multi-recruiter companies): posting with a colleague's `applicationId` routes you to your own direct thread (see section 2.2). Don't assert `thread.applicationId != null` for recruiters who don't own the application — that check only holds for the recruiter who is a participant of the application thread.

---

## 5.1 Permission revoked mid-chat (company chat access) — REQUIRED handling

Employers can see/continue colleagues' company threads only while they hold the `company-chat:read` permission. The super employer can revoke it **at any time, while the chat screen is open**. After revocation, every call on that thread returns `403` (`"Not authorized to view this thread"` / `"Not authorized to view messages"` / `"Not authorized to send messages in this thread"`).

**Required UX (both Web and RN):**

1. **Thread details / messages fetch returns 403 or 404** → swap the chat area for a friendly full-state panel:
   - Title: *"This conversation is no longer available"*
   - Body: *"You no longer have access to this conversation. Your permissions may have changed, or the conversation may have been removed."*
   - A "Back to Messages" button → navigate to the thread list.
   - Remove the thread from any cached/in-memory thread list.
2. **Send returns 403** → show the same message inline (banner/alert above the composer), disable the composer. Distinguish from the application-status restriction by the message text (`"Not authorized"` prefix = permission problem; `"Chat is not allowed..."` = status restriction).
3. **Never retry** these 403s — they are not transient.
4. **Do not persist thread lists or messages** to device storage / localStorage keyed across sessions: company-thread visibility is permission-scoped and goes stale silently. Refetch the thread list on every mount of the messages screen.
5. WebSocket: live events for a revoked thread may still arrive until reconnect — REST is the source of truth; the 403 on the next fetch/send is the revocation signal.

Web reference implementation: `apps/job-board-web/src/app/(main)/chat/[roomId]/page.tsx` (`accessDenied` state) and `ChatFooter.tsx` (403 mapping). RN must mirror this.

---

## 6. QA checklist

- [ ] Employer → search → public candidate (never applied) → Message → 201, chat opens, `applicationId: null`
- [ ] Same employer → same candidate → Message again → same `thread.id`, `isNew: false`
- [ ] Employer → candidate whose only application to the company is `rejected` → 403 with friendly UI
- [ ] Candidate app → sourcing thread appears in inbox, no job title shown, company name rendered, reply works
- [ ] Candidate app → no path exists to create a thread without an application (and a forced call returns 403)
- [ ] Thread list renders with `jobTitle: null` without crash (Web + RN, employer + candidate)
- [ ] "View application" affordance hidden when `applicationId: null`
- [ ] Employer with `applicationId` context → existing flow unchanged (thread tied to the application)
- [ ] `ownJobsOnly=true` inbox filter still shows the recruiter's sourcing threads
- [ ] Push notification for a sourcing-thread message deep-links to the chat (no applicationId in payload)
- [ ] **Payload regression**: sending from ANY application-context screen **as the recruiter who owns the application thread** → response `thread.applicationId` is non-null (catches the silent sourcing-thread fallback, case 1 in section 2.4)
- [ ] Sending from search context → response `thread.applicationId` is null and recipient matches the rendered profile's `userId`
- [ ] **Colleague rule**: recruiter B (same company as A) → search → candidate with application thread owned by A → Message → B gets a NEW direct thread (`thread.applicationId: null`), A's thread untouched; candidate sees two separate conversations
- [ ] Recruiter B revisits the same profile → top-level `threadId` = B's direct thread (not A's)
- [ ] **Permission revoke**: employer with `company-chat:read` opens a colleague's thread → super employer revokes the permission → next fetch/send shows the friendly "no longer available" state (no crash, no raw error), thread disappears from the list after refetch
