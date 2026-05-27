# Notification Routing and Job Status Implementation

## Goal

Implement click-through navigation from notifications and display job status in the job details page.

## Functionality To Be Implemented

This work will add two user-facing behaviors:

1. Notification cards will become navigational entry points.
  - Job alert notifications open the related job details page.
  - Application update notifications open the application tracking page.
  - Message notifications open the correct chat thread.
  - Interview notifications open the correct tracking page.

2. Job details pages will reflect the job’s current state.
  - The page will show the job status from the API response.
  - The apply button will be disabled when the job status is `hold`.

In simple terms, the notification card should act like a smart link. When the user clicks a notification, the app reads the notification type, extracts the correct id from the `metadata` field, and sends the user to the matching page.

The job details page should also use the API response to show the current job `status`, and it should prevent applying when the job is on hold.

## How The Implementation Works

1. Load notifications from the API.
2. For each notification, inspect the `type` value.
3. Parse the `metadata` JSON string to get the related id.
4. Use the route helper from `routePaths` to navigate to the correct page.
5. On the job details page, read the `status` from the job response.
6. If `status` is `hold`, disable the apply button so the user cannot submit an application.

## Notification Click Behavior

Use the notification `type` field to decide the destination route. Read the route parameter from the notification `metadata` JSON string.

### Routing Rules

- `job_alert`
  - Read `jobId` from `metadata`
  - Navigate to `/jobs/{jobId}`

- `application_update`
  - Read `jobId` from `metadata` when available
  - If the payload only contains `applicationId`, use that value as the route id fallback
  - Navigate to `/my-applications/{id}/track`

- `message`
  - Read `threadId` from `metadata`
  - Navigate to `/chat/{threadId}`

- `interview`
  - Read `interviewId` from `metadata`
  - Navigate to `/my-applications/{interviewId}/track`

## Job Details API Usage

The job details page should use the job fetch response to render the current job state.

The response already contains `status`, `isApplied`, `isSaved`, and other job-specific fields, so the page does not need a second request just to know whether the user can apply. The UI should derive the button state directly from this payload.

### Display Requirements

- Show the job `status` clearly in the details UI.
- Keep the existing job information visible as normal.

### Recommended UI Behavior

- Show the status as a small badge or label near the job title or action area.
- Use a muted style for inactive states like `hold`.
- Keep the apply button visible, but disabled when the job is on hold.
- If the job is already applied, keep the existing applied-state behavior if the page already supports it.

### Apply Button Rules

- If `status` is `hold`, disable the apply button.
- If `status` is anything else, keep the apply button enabled unless another existing rule already disables it.
- The UI should make the disabled state obvious to the user.

## Suggested Implementation Notes

- Parse `metadata` safely before reading route parameters.
- Keep the notification card click handler separate from delete actions so delete does not trigger navigation.
- Reuse the existing route helpers in `src/app/config/routePaths.ts` instead of hardcoding paths.
- If `application_update` only gives `applicationId`, use that value as the track-page identifier unless the API later provides a more specific job id.
- If `metadata` is missing or invalid, fall back gracefully instead of breaking the notification click.

## Acceptance Criteria

- Clicking a job alert notification opens the matching job details page.
- Clicking an application update notification opens the application tracking page.
- Clicking a message notification opens the correct chat thread.
- Clicking an interview notification opens the correct tracking page.
- Job details render the status from the job API response.
- The apply button is disabled when the job status is `hold`.