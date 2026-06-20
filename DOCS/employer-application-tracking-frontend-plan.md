# Employer Application Tracking — Frontend Implementation Plan

Mirror the candidate-side application tracking (timeline) on the employer side, reusing the existing design pattern, components, and types.

## Backend (DONE — for reference)

New employer-scoped endpoint already implemented in `application-service`:

- **Route**: `GET /applications/:id/employer-history`
- **Auth**: `@Roles('employer', 'super_employer')` + `RolesGuard`
- **Access scope**: employer who directly owns the job, OR a same-company member with `company-applications:read` permission.
- **Response shape**: identical to the candidate `GET /applications/:id/history` endpoint. Milestone wording is employer-facing ("Candidate was shortlisted" vs candidate "You were shortlisted").
- Timeline build logic is shared between candidate and employer via `assembleApplicationTimeline()`, so the `timeline[]` entries match exactly what `TrackTimeline` already renders.
- Gateway: no change needed — proxied by the existing `applications/*` wildcard.

### Response structure

Top-level envelope (added by the global response interceptor):

```jsonc
{
  "status": "success",
  "statusCode": 200,
  "message": "Application history fetched successfully",
  "data": {
    "applicationId": "517902ae-b58d-4de2-94ff-006d017fc3bd",
    "jobId": "e3d1bcbe-e142-41f0-9875-24d7fd5c2b7b",   // nullable
    "jobTitle": "Content Writing",                       // nullable
    "currentStatus": "interview_completed",
    "appliedAt": "2026-06-16T04:57:36.110Z",
    "timeline": [ /* TimelineEntry[], most recent first */ ]
  }
}
```

> Note: `http.get(...)` in the web app returns the parsed body. The candidate track page sets state from `response.data` — so `response.data` IS the `data` object above (`{ applicationId, jobId, jobTitle, currentStatus, appliedAt, timeline }`), which maps to `IApplicationTrack`. Same for employer.

`TimelineEntry` (each item in `timeline[]`):

```jsonc
{
  "id": "a1b2c3d4-...",          // history row id; synthetic "applied-<applicationId>" for the first entry
  "type": "interview_completed",  // stable machine category (see enum below)
  "title": "Interview completed", // short heading
  "description": "Great writing test", // nullable subtext (reason / notes / milestone line)
  "status": "interview_completed",     // application status at this event
  "timestamp": "2026-06-16T05:14:08.810Z",
  "interview": { /* TimelineInterview | null — present only for interview events */ }
}
```

`type` enum (`TIMELINE_EVENT_TYPES`):
`application_submitted`, `application_viewed`, `shortlisted`, `interview_scheduled`, `interview_rescheduled`, `interview_cancelled`, `interview_round_completed`, `interview_in_progress`, `interview_completed`, `offer_made`, `offer_accepted`, `offer_rejected`, `hired`, `rejected`, `withdrawn`.

`TimelineInterview` (nested `interview` object, all fields nullable):

```jsonc
{
  "id": "a1b2c3d4-...",
  "roundNumber": 1,              // system round sequence (oldest-first)
  "roundName": "round 2",        // employer label
  "interviewType": "other",
  "customType": "writing test",
  "interviewMode": "online",     // "online" | "offline"
  "interviewTool": "zoom",
  "scheduledAt": "2026-06-16T05:08:00.000Z",
  "duration": 15,                // minutes
  "location": "",
  "meetingLink": "https://us05web.zoom.us/j/85171874451",
  "status": "completed",         // scheduled|confirmed|in_progress|completed|rescheduled|canceled|no_show
  "rating": 4,                   // 1-5 interviewer rating
  "reason": null,                // reschedule / cancel reason
  "notes": "Great writing test"  // interviewer notes
}
```

Swagger DTOs: `apps/application-service/src/application/dto/application-history-response.dto.ts`.
Frontend types (reuse as-is): `IApplicationTrack`, `ITimeline` in `apps/job-board-web/src/app/types/types.ts`.

## Candidate-side pattern (what we are mirroring)

| Piece | File |
|-------|------|
| "Track" button | `apps/job-board-web/src/app/components/cards/ApplicationCard.tsx` (button → `routePaths.applications.track(id)`) |
| Route | `routePaths.applications.track` = `/my-applications/{id}/track` |
| Track page | `apps/job-board-web/src/app/(main)/my-applications/[id]/track/page.tsx` |
| Timeline UI | `apps/job-board-web/src/app/components/application/TrackTimeline.tsx` (REUSE as-is) |
| Endpoint | `ENDPOINTS.APPLICATIONS.GET_HISTORY` |
| Types | `IApplicationTrack`, `ITimeline` in `apps/job-board-web/src/app/types/types.ts` (REUSE) |

Candidate track page flow: `use(params)` → `http.get(GET_HISTORY(id))` → `setApplication(res.data)` → render `<TrackTimeline timeline={application.timeline} />` inside a HeroUI `Card`.

## Frontend changes (TO DO)

All paths relative to `apps/job-board-web/src/app/`.

### 1. Add employer endpoint — `api/endpoints.ts`

In `EMPLOYER.APPLICATIONS` (around line 185):

```ts
APPLICATIONS: {
  ALL: '/applications/employer/all-applications',
  LIST: (jobId: string) => `/applications/job/${jobId}`,
  PROFILE_DETAILS: (id: string) => `/applications/${id}/candidate-profile`,
  DOWNLOAD_RESUME: (id: string) => `/applications/${id}/resume-url`,
  ANALYTICS: '/applications/analytics/employer',
  GET_HISTORY: (id: string) => `/applications/${id}/employer-history`, // NEW
},
```

### 2. Add employer track route — `config/routePaths.ts`

Under `employee.jobs`:

```ts
applicantProfile: (applicationId: string, applicantId: string) =>
  `/employee/jobs/${applicationId}/applications/${applicantId}`,
// NEW — keep the existing [id]/applications/[applicantId] segment shape:
applicantTrack: (jobId: string, applicantId: string) =>
  `/employee/jobs/${jobId}/applications/${applicantId}/track`,
```

> Note: in the applicant-profile route the first param is named `applicationId` but the URL segment is the job `[id]`. Keep the same segment shape so the new page sits as a sibling of the existing applicant page.

### 3. New track page

**File**: `(main)/employee/jobs/[id]/applications/[applicantId]/track/page.tsx`

Mirror the candidate track page almost 1:1. Differences: use the employer endpoint, and the route exposes both `[id]` (job) and `[applicantId]` params — the **applicationId we fetch with is `applicantId`** (that segment carries the applicationId, same as the existing applicant-profile page which calls `PROFILE_DETAILS(id)` with the `[applicantId]` segment — verify against that page).

```tsx
'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import BackButton from '@/app/components/lib/BackButton';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import withAuth from '@/app/hoc/withAuth';
import { IApplicationTrack } from '@/app/types/types';
import { use, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import TrackTimeline from '@/app/components/application/TrackTimeline';
import { Card, CardBody, CardHeader, Divider } from '@heroui/react';

const page = ({ params }: { params: Promise<{ id: string; applicantId: string }> }) => {
  const { applicantId } = use(params); // applicationId
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<IApplicationTrack | null>(null);

  const getTimeline = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.EMPLOYER.APPLICATIONS.GET_HISTORY(applicantId));
      setApplication(response.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTimeline();
  }, []);

  return (
    <>
      <title>{application?.jobTitle || 'Track Application'}</title>
      {loading ? (
        <LoadingProgress />
      ) : (
        <div className="container mx-auto p-4">
          <div className="flex flex-col gap-6 mb-8">
            <BackButton showLabel />
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
                Application Timeline
              </h1>
              <p className="text-default-500 font-medium">
                Activity for this application to{' '}
                <span className="text-primary">{application?.jobTitle}</span>
              </p>
            </div>
          </div>

          <Card className="shadow-2xl border-none bg-background/60 backdrop-blur-md">
            <CardHeader className="flex flex-col gap-1 px-8 pt-8 items-start">
              <h2 className="text-xl font-bold">Application Status</h2>
              <p className="text-default-400 text-sm">
                Last updated on{' '}
                {application?.appliedAt
                  ? dayjs(application.appliedAt).format('MMMM D, YYYY')
                  : 'N/A'}
              </p>
            </CardHeader>
            <Divider className="my-2 mx-8 w-[calc(100%-64px)]" />
            <CardBody className="px-4 py-6">
              {application?.timeline && <TrackTimeline timeline={application.timeline} />}
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
};

export default withAuth(page);
```

### 4. Add "Track" button on the employer applicant details page

**File**: `(main)/employee/jobs/[id]/applications/[applicantId]/ApplicantDetails.tsx`

Add a `Track` button matching the candidate `ApplicationCard` button style:

```tsx
<Button
  color="success"
  size="sm"
  as={Link}
  href={routePaths.employee.jobs.applicantTrack(jobId, applicationId)}
  className="text-white font-medium"
  startContent={<MdHistory size={16} />}
>
  Track
</Button>
```

- Import `Link` from `next/link`, `routePaths`, and `MdHistory` from `react-icons/md`.
- `jobId` = the `[id]` route segment, `applicationId` = `[applicantId]` segment (or `application.applicationId` from the profile payload). Pull from the parent page (`page.tsx`) via props, or read params — match whatever `ApplicantDetails` already receives.
- Place it next to the existing action buttons (Schedule Interview / Message / Download Resume).

### 5. (Optional) Track button on the applicant grid card

**File**: `apps/job-board-web/src/app/components/cards/JobApplicantCard.tsx`

If we want parity with the candidate card grid, add the same `Track` button linking to `routePaths.employee.jobs.applicantTrack(jobId, applicationId)`. The card receives `applicationId` already; it needs the `jobId` (pass from the applications list page where `id` is available).

> Decision pending: button on **detail page only** (recommended, matches the "application details page" requirement) vs **card + detail page**. Section 5 is only needed if card placement is chosen.

## Verification

1. `pnpm dev:core` (gateway + auth + user + job + application).
2. Log in as employer, open a job's applicants → open an applicant → click **Track**.
3. Confirm timeline renders (applied → viewed → shortlisted → interview → offer/hired), employer-facing wording, interview chips/Join Meeting links.
4. Confirm a non-owning employer (different company) gets 403.

## Files touched (summary)

| # | File | Change |
|---|------|--------|
| 1 | `api/endpoints.ts` | add `EMPLOYER.APPLICATIONS.GET_HISTORY` |
| 2 | `config/routePaths.ts` | add `employee.jobs.applicantTrack` |
| 3 | `(main)/employee/jobs/[id]/applications/[applicantId]/track/page.tsx` | new page (reuses `TrackTimeline`) |
| 4 | `.../[applicantId]/ApplicantDetails.tsx` | add Track button |
| 5 | `components/cards/JobApplicantCard.tsx` | (optional) add Track button |

No new component or type — `TrackTimeline`, `IApplicationTrack`, `ITimeline` are reused.
