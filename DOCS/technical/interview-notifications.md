# Interview Notification Response Structure

Reference for all interview-related notifications: DB shape, API envelope, and per-event payloads for **both candidate and employer**.

---

## 1. Notification API Envelope

`GET /api/v1/notifications`

**Query params**

| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page |
| `unreadOnly` | boolean | `false` | Return only unread |

**Response**

```json
{
  "data": [ /* Notification[] */ ],
  "message": "Notifications retrieved successfully",
  "pagination": {
    "totalNotification": 42,
    "pageCount": 3,
    "currentPage": 1,
    "hasNextPage": true
  }
}
```

Other endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/notifications/unread-count` | `{ "data": { "count": 5 }, "message": "..." }` |
| `POST` | `/notifications/:id/read` | Mark one read |
| `POST` | `/notifications/read-all` | Mark all read |
| `DELETE` | `/notifications/:id` | Delete one |
| `DELETE` | `/notifications` | Delete all |

---

## 2. Single Notification Object

Row from the `notifications` table.

```json
{
  "id": "uuid",
  "userId": "uuid",
  "type": "job_alert | application_update | interview | message | system",
  "channel": "email | sms | whatsapp | push",
  "title": "string (max 255)",
  "message": "string",
  "metadata": "string | null",
  "isRead": false,
  "readAt": "2026-07-02T10:30:00Z | null",
  "createdAt": "2026-07-02T10:30:00Z"
}
```

### Field notes

- **`type`** — DB enum has only 5 values. All interview events share `type: "interview"`. The specific event lives in `metadata` / `pushData.type`.
- **`channel`** — the persisted in-app row is always `"push"`. Email/SMS are delivered separately (not stored here).
- **`metadata`** — **stringified JSON**, not an object. Client must `JSON.parse(metadata)`.
- **`pushData.type`** — the FCM data-payload discriminator the frontend should switch on. NOT stored in the DB row; delivered only in the live FCM push. Listed below per event for client routing.

---

## 3. Interview Event Matrix

All interview notifications fire to **both** recipients. Category preference gate: `interviewReminders` (push/email/sms toggles).

| Event | Candidate `pushData.type` | Employer `pushData.type` | SMS to candidate? |
|-------|---------------------------|--------------------------|-------------------|
| Scheduled | `INTERVIEW_SCHEDULED` | `EMPLOYER_INTERVIEW_SCHEDULED` | Yes (reminder) |
| Rescheduled | `INTERVIEW_RESCHEDULED` | `EMPLOYER_INTERVIEW_RESCHEDULED` | Yes |
| Cancelled | `INTERVIEW_CANCELLED` | `EMPLOYER_INTERVIEW_CANCELLED` | Yes |
| Completed | `INTERVIEW_COMPLETED` | `EMPLOYER_INTERVIEW_COMPLETED` | No |

> **Completed** is push + in-app only. No SMS, no email (no SES template yet).

---

## 4. Per-Event Payloads

### 4.1 Interview Scheduled

**Candidate**
```json
{
  "type": "interview",
  "channel": "push",
  "title": "Interview Scheduled",
  "message": "video interview for Senior React Dev on 7/5/2026, 3:00:00 PM",
  "metadata": { "interviewId": "uuid" }
}
```
`pushData`: `{ "type": "INTERVIEW_SCHEDULED", "interviewId": "uuid" }`

**Employer**
```json
{
  "type": "interview",
  "channel": "push",
  "title": "Interview Scheduled",
  "message": "Interview scheduled with John Doe for Senior React Dev",
  "metadata": { "interviewId": "uuid", "candidateEmail": "john@example.com" }
}
```
`pushData`: `{ "type": "EMPLOYER_INTERVIEW_SCHEDULED", "interviewId": "uuid" }`

---

### 4.2 Interview Rescheduled

**Candidate**
```json
{
  "type": "interview",
  "channel": "push",
  "title": "Interview Rescheduled",
  "message": "Your interview for Senior React Dev has been rescheduled to 7/8/2026, 4:00:00 PM",
  "metadata": {
    "interviewId": "uuid",
    "oldScheduledAt": "2026-07-05T09:30:00Z",
    "newScheduledAt": "2026-07-08T10:30:00Z"
  }
}
```
`pushData`: `{ "type": "INTERVIEW_RESCHEDULED", "interviewId": "uuid" }`

**Employer**
```json
{
  "type": "interview",
  "channel": "push",
  "title": "Interview Rescheduled",
  "message": "Interview with John Doe for Senior React Dev rescheduled to 7/8/2026, 4:00:00 PM",
  "metadata": {
    "interviewId": "uuid",
    "oldScheduledAt": "2026-07-05T09:30:00Z",
    "newScheduledAt": "2026-07-08T10:30:00Z"
  }
}
```
`pushData`: `{ "type": "EMPLOYER_INTERVIEW_RESCHEDULED", "interviewId": "uuid" }`

---

### 4.3 Interview Cancelled

**Candidate**
```json
{
  "type": "interview",
  "channel": "push",
  "title": "Interview Cancelled",
  "message": "Your interview for Senior React Dev at Infosys has been cancelled",
  "metadata": {
    "interviewId": "uuid",
    "scheduledAt": "2026-07-05T09:30:00Z",
    "reason": "Position filled"
  }
}
```
`pushData`: `{ "type": "INTERVIEW_CANCELLED", "interviewId": "uuid" }`

**Employer**
```json
{
  "type": "interview",
  "channel": "push",
  "title": "Interview Cancelled",
  "message": "Interview with John Doe for Senior React Dev has been cancelled",
  "metadata": {
    "interviewId": "uuid",
    "scheduledAt": "2026-07-05T09:30:00Z",
    "reason": "Position filled"
  }
}
```
`pushData`: `{ "type": "EMPLOYER_INTERVIEW_CANCELLED", "interviewId": "uuid" }`

> `reason` may be absent (`undefined`) if none provided.

---

### 4.4 Interview Completed

**Candidate**
```json
{
  "type": "interview",
  "channel": "push",
  "title": "Interview Completed",
  "message": "Your interview for Senior React Dev at Infosys has been completed",
  "metadata": {
    "interviewId": "uuid",
    "scheduledAt": "2026-07-05T09:30:00Z"
  }
}
```
`pushData`: `{ "type": "INTERVIEW_COMPLETED", "interviewId": "uuid" }`

**Employer**
```json
{
  "type": "interview",
  "channel": "push",
  "title": "Interview Completed",
  "message": "Interview with John Doe for Senior React Dev has been completed",
  "metadata": {
    "interviewId": "uuid",
    "scheduledAt": "2026-07-05T09:30:00Z"
  }
}
```
`pushData`: `{ "type": "EMPLOYER_INTERVIEW_COMPLETED", "interviewId": "uuid" }`

---

## 5. metadata Keys Summary

| Event | metadata keys |
|-------|---------------|
| Scheduled (candidate) | `interviewId` |
| Scheduled (employer) | `interviewId`, `candidateEmail` |
| Rescheduled (both) | `interviewId`, `oldScheduledAt`, `newScheduledAt` |
| Cancelled (both) | `interviewId`, `scheduledAt`, `reason?` |
| Completed (both) | `interviewId`, `scheduledAt` |

---

## 6. Related Enums (source of truth)

`packages/database/src/schema/enums.ts`

- **`notificationTypeEnum`**: `job_alert`, `application_update`, `interview`, `message`, `system`
- **`notificationChannelEnum`**: `email`, `sms`, `whatsapp`, `push`
- **`interviewStatusEnum`**: `scheduled`, `confirmed`, `completed`, `rescheduled`, `canceled`, `no_show`
- **`interviewTypeEnum`**: `phone`, `video`, `in_person`, `technical`, `hr`, `panel`, `assessment`, `other`

---

## 7. Flow (where it comes from)

```
application-service                notification-service
  interview.service.ts               queue.processor.ts
  - schedule()      -+              +- handleInterviewScheduled / ...Employer...
  - reschedule()    -+   SQS queue  +- handleInterviewRescheduled / ...Employer...
  - cancel()        -+--------------+- handleInterviewCancelled / ...Employer...
  - complete()      -+              +- handleInterviewCompleted / ...Employer...
                                          |
                                          +- notificationService.create()  -> DB in-app row
                                          +- pushService.sendToUser()       -> FCM push (pushData)
                                          +- emailService.*                 -> SES (except completed)
                                          +- snsService.*                   -> SMS (not completed)
```

Each handler respects the user's `interviewReminders` channel preferences before sending on that channel.
