# Frontend Plan — Double-booking Warning Modal + Remove "In Progress" Status

Two changes. Backend for both is **already implemented** (see notes). This doc covers the frontend (`apps/job-board-web`) work only.

---

## Part A — Double-booking warning modal

### Backend (DONE — for reference)
- `schedule()` and `update()` (reschedule) in `application-service` now detect time overlaps **for the same employer only** (any candidate, any of the employer's jobs; active rounds `scheduled`/`confirmed`/`rescheduled` only).
- On overlap they throw **HTTP 409** with body:
  ```jsonc
  {
    "code": "INTERVIEW_TIME_CONFLICT",
    "message": "You already have an interview scheduled in this time slot.",
    "conflicts": [
      {
        "interviewId": "…",
        "applicationId": "…",
        "scheduledAt": "2026-04-09T08:30:00.000Z",
        "duration": 30,
        "status": "scheduled",
        "interviewType": "video",
        "jobTitle": "React Native Developer",
        "candidateName": "Maya Devi"
      }
    ]
  }
  ```
- It's a **soft** warning: resend the same request with **`ignoreConflict: true`** to schedule/reschedule anyway. The `ignoreConflict` field already exists on the schedule/update DTO.

### Frontend changes

#### A1. Stop the generic error toast for this one code — `src/app/api/http.ts`
The response interceptor (around line 144) shows a generic "Oops!" toast for every non-429 error. The conflict must be handled by the modal instead, so suppress the auto-toast for it:

```ts
// inside the error handler, replace the else branch that always toasts
if (error.response?.status === 429) {
  showRateLimitToast();
} else if (error.response?.data?.code !== 'INTERVIEW_TIME_CONFLICT') {
  addToast({
    title: 'Oops!',
    color: 'danger',
    description: error.response?.data?.message || 'Something went wrong',
  });
}
```
> The interceptor rejects with `error.response.data`, so callers receive `{ code, message, conflicts }` directly.

#### A2. New component — `src/app/components/dialogs/InterviewConflictDialog.tsx`
Warning modal (HeroUI `Modal`). Props: `isOpen`, `onClose`, `conflicts: IInterviewConflict[]`, `onConfirm: () => void`, `loading?: boolean`. Layout: warning icon + text "You already have interview(s) in this slot", a list of conflicts (candidate name · job title · `dayjs(scheduledAt).format('DD MMM YYYY, h:mm A')` · `${duration} mins`), then footer buttons **Cancel** and **Schedule anyway** (`color="warning"`, `isLoading={loading}` → `onConfirm`). Mirror the structure of the existing `InProgressInterviewDialog` / `CompleteInterviewDialog` for styling consistency.

#### A3. Wire into schedule — `src/app/(main)/employee/jobs/[id]/schedule/ScheduleInterviewForm.tsx`
`onSubmit` currently `await http.post(ENDPOINTS.EMPLOYER.INTERVIEWS.SCHEDULE, payload)` (line ~104). Add conflict handling:

```ts
const [conflictModal, setConflictModal] = useState<{ open: boolean; conflicts: any[] }>({
  open: false,
  conflicts: [],
});
const [pendingPayload, setPendingPayload] = useState<any>(null);

const submit = async (payload: any) => {
  await http.post(ENDPOINTS.EMPLOYER.INTERVIEWS.SCHEDULE, payload);
  // …existing success toast + redirect…
};

const onSubmit = async (data) => {
  const payload = { /* existing payload mapping */ };
  try {
    await submit(payload);
  } catch (err: any) {
    if (err?.code === 'INTERVIEW_TIME_CONFLICT') {
      setPendingPayload(payload);
      setConflictModal({ open: true, conflicts: err.conflicts || [] });
      return;
    }
    // other errors already toasted by interceptor
  }
};

const handleConfirmConflict = async () => {
  if (!pendingPayload) return;
  await submit({ ...pendingPayload, ignoreConflict: true });
  setConflictModal({ open: false, conflicts: [] });
  setPendingPayload(null);
};
```
Render `<InterviewConflictDialog isOpen={conflictModal.open} conflicts={conflictModal.conflicts} onConfirm={handleConfirmConflict} onClose={() => setConflictModal({ open: false, conflicts: [] })} />`.

#### A4. Wire into reschedule — `src/app/components/dialogs/RescheduleInterviewDialog.tsx`
Same pattern around its `http.put(ENDPOINTS.EMPLOYER.INTERVIEWS.UPDATE(id), payload)` call: catch `err.code === 'INTERVIEW_TIME_CONFLICT'`, show the conflict dialog, on confirm resend with `ignoreConflict: true`.

#### A5. Types — `src/app/types/types.ts`
Add:
```ts
export interface IInterviewConflict {
  interviewId: string;
  applicationId: string;
  scheduledAt: string;
  duration: number;
  status: string;
  interviewType: string;
  jobTitle: string | null;
  candidateName: string | null;
}
```
Add optional `ignoreConflict?: boolean` to the schedule/reschedule payload types if they are typed.

---

## Part B — Remove "In Progress" status / action completely

The "Mark in progress" action and the `interview_in_progress` flow are removed. After a round, the employer uses **Complete**; another round is added via **Add Interview** (shown when the round is `completed`).

### Backend (DONE — for reference)
- Removed `POST /interviews/:id/in-progress` route + `markInProgress()` service method.
- `schedule()` no longer carries the application into `interview_in_progress` (always `interview_scheduled`).
- **DB enum value `interview_in_progress` is intentionally kept.** Dropping a Postgres enum value needs a destructive type-recreate + data migration, and historical `application_history` rows/events may reference it. No new code produces it. If you want it physically dropped, that's a separate migration — flag it.

### Frontend changes

#### B1. `src/app/(main)/employee/interviews/InterviewListTable.tsx`
- Remove import of `InProgressInterviewDialog` (line 7).
- `getRowDisplayStatus` (lines 75–79): delete the `completed + interview_in_progress → in_progress` remap; just `return interview.status;`.
- `InterviewActionKey` (line 81): drop `'in_progress'`.
- In `InterviewActionsSelect`: remove `onInProgress` prop (86, 93), `isInProgressRound` (110–112), `canMarkInProgress` (119); set `canComplete = isActiveRound;` (drop `|| isInProgressRound`).
- `handleSelectionChange`: remove the `if (action === 'in_progress')` branch (134–136).
- Remove the `Mark in progress` `SelectItem` (line 180).
- Remove the `onInProgress={…}` wiring on `<InterviewActionsSelect>` (316–322).
- Remove the `statusModal.type === InterviewStatus.in_progress` block rendering `<InProgressInterviewDialog>` (367–374).

#### B2. `src/app/(main)/employee/interviews/[id]/InterviewDetails.tsx`
- Remove import (27), `inProgressOpen` state (42), `canMarkInProgress` (107–116), the **In Progress** button (426–430), and the `<InProgressInterviewDialog>` block (521–531).
- `canComplete` (99–104): remove the `interview?.status === InterviewStatus.in_progress` branch.
- `canAddRound` (113–116): change from `status === completed && overallStatus === interview_in_progress` to just `hasCreatePermission && interview?.status === InterviewStatus.completed`. (The existing "Add Interview" fallback button at 447–459 already covers adding the next round once a round is completed — verify no duplicate button shows; keep one.)

#### B3. `src/app/(main)/employee/interviews/InterviewsListFilters.tsx`
- Line 20: remove `'in_progress'` from `statusOptions` (filter dropdown).

#### B4. Delete unused component
- `src/app/components/dialogs/InProgressInterviewDialog.tsx` — remove once B1/B2 no longer import it.

#### B5. Keep (backward-compat for legacy data — do NOT remove)
- `src/app/types/enum.ts` (110, 114): keep `in_progress` / `interview_in_progress` enum members so old rows/history still resolve.
- `src/app/utils/commonUtils.ts` (158–159, 254–255): keep the status label/color cases.
- `src/app/components/application/TrackTimeline.tsx` (37): keep the `interview_in_progress` timeline style.
> These only render historical records; no new data will use them.

---

## Verification
1. `pnpm dev:core`, log in as employer.
2. **Conflict:** schedule two interviews in the same slot → second triggers the warning modal; "Schedule anyway" creates it; "Cancel" aborts. Repeat via Reschedule. Confirm no duplicate "Oops!" toast.
3. **Remove in-progress:** confirm the "Mark in progress" / "In Progress" option is gone from the list dropdown, the details page, and the status filter. Confirm a completed round still offers **Add Interview** and **Complete** still finalizes. Confirm an old `interview_in_progress` record (if any) still displays a sensible label.

## Files touched (summary)
| Part | File | Change |
|------|------|--------|
| A1 | `api/http.ts` | skip auto-toast for `INTERVIEW_TIME_CONFLICT` |
| A2 | `components/dialogs/InterviewConflictDialog.tsx` | new warning modal |
| A3 | `…/schedule/ScheduleInterviewForm.tsx` | catch 409 → modal → resend `ignoreConflict` |
| A4 | `components/dialogs/RescheduleInterviewDialog.tsx` | same conflict handling |
| A5 | `types/types.ts` | `IInterviewConflict`, `ignoreConflict` |
| B1 | `…/interviews/InterviewListTable.tsx` | strip in-progress action + status remap |
| B2 | `…/interviews/[id]/InterviewDetails.tsx` | strip in-progress button/dialog; rework `canAddRound` |
| B3 | `…/interviews/InterviewsListFilters.tsx` | remove `in_progress` filter option |
| B4 | `components/dialogs/InProgressInterviewDialog.tsx` | delete |
| B5 | `enum.ts`, `commonUtils.ts`, `TrackTimeline.tsx` | **keep** (legacy display) |
