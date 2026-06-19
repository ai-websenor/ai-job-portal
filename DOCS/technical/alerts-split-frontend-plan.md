# Alerts split — frontend implementation plan

> Backend is **done**. This doc is the frontend-only follow-up. No frontend code was edited; this is the plan.

## What changed on the backend

The single combined `GET /api/v1/alerts` endpoint was **removed** and replaced by two endpoints:

| Endpoint | Roles | Alert types | Notes |
|----------|-------|-------------|-------|
| `GET /api/v1/alerts/interviews` | candidate, employer, super_employer | `interview_today` | |
| `GET /api/v1/alerts/subscription` | employer, super_employer | `low_credits`, `job_expiring` | employer-only; candidates get `{ alerts: [], count: 0 }` |

### Query params (all optional, combinable)

| Param | Endpoint | Values |
|-------|----------|--------|
| `limit` | both | positive int — top-N severity-ranked; omit for full list |
| `severity` | both | `info` \| `warning` \| `critical` |
| `mode` | interviews | `online` \| `offline` |
| `status` | interviews | `scheduled` \| `confirmed` \| `rescheduled` |
| `type` | subscription | `low_credits` \| `job_expiring` |
| `fromDate` | both | ISO 8601 — alerts dated on/after (vs `meta.scheduledAt` / `meta.deadline`) |
| `toDate` | both | ISO 8601 — alerts dated on/before |

Filters apply **before** the `limit` slice, and `count` reflects the **filtered** total. Unknown params are stripped (400 on invalid enum / date value). Date filters compare against `meta.scheduledAt` (interviews) or `meta.deadline` (job_expiring); dateless alerts (e.g. `low_credits`) drop out when a date bound is set.

Both endpoints return the same shape:

```jsonc
{
  "alerts": [ /* AlertDto[] — severity-ranked: critical -> warning -> info */ ],
  "count": 12   // TOTAL available, ignores limit
}
```

- `?limit=4` → top 4 severity-ranked alerts (dashboard cards).
- no `limit` → full list (the "view all" screen).
- `count` is always the **pre-slice total** → use it to decide whether to render "View all" (e.g. `count > alerts.length`).

`AlertDto` shape is unchanged (`id`, `type`, `severity`, `title`, `message`, `actionUrl`, `actionLabel`, `meta`).

## Files to update (`apps/job-board-web`)

### 1. `src/app/api/endpoints.ts`

Replace:

```ts
ALERTS: {
  LIST: '/alerts',
},
```

with:

```ts
ALERTS: {
  INTERVIEWS: '/alerts/interviews',
  SUBSCRIPTION: '/alerts/subscription',
},
```

### 2. `src/app/hooks/useAlerts.ts`

Currently fetches `ALERTS.LIST` into a single `alerts` array. Split into the two feeds and surface `count` for the "view all" gate. Suggested shape:

```ts
const useAlerts = (limit = 4) => {
  // interview feed (all roles) + subscription feed (employer only)
  // each fetch: http.get(`${ENDPOINTS.ALERTS.INTERVIEWS}?limit=${limit}`)
  //             http.get(`${ENDPOINTS.ALERTS.SUBSCRIPTION}?limit=${limit}`)
  // return { interviewAlerts, interviewCount,
  //          subscriptionAlerts, subscriptionCount,
  //          loading, reload }
};
```

- Keep the 5-min poll + `focus` reload, but reload **both** feeds.
- For a candidate, skip / ignore the subscription feed (or rely on the empty `{ alerts: [], count: 0 }` it returns — 403 if role guard blocks, so prefer skipping by role).
- "View all" screen calls the same endpoint **without** `limit`.

### 3. Consumers of `useAlerts`

These read the old single `alerts` array and must move to the new split fields:

- `src/app/components/job-search/JobSearchRightSection.tsx`
- `src/app/components/candidate-search/CandidateSearchRightRail.tsx`

Render interview alerts and subscription alerts as separate sections/cards. Show "View all" per section when `count > shownCount`.

### 4. Types — `src/app/types/alerts.ts`

`Alert` / `AlertListResponse` shape is unchanged. If a literal union exists for the combined response, no change needed. Optionally narrow `AlertType` per feed (`'interview_today'` vs `'low_credits' | 'job_expiring'`).

### 5. "View all" route

Wire a route/screen that calls the endpoint without `limit` for the full list. Reuse existing `routePaths.ts` patterns. (Decide: one combined "all alerts" page with two tabs, or two routes.)

## Test checklist

- Candidate: interviews feed populates; subscription feed skipped/empty.
- Employer: both feeds populate, `low_credits` + `job_expiring` under subscription.
- `?limit=4` returns ≤ 4, `count` reflects true total.
- "View all" (no limit) returns full list.
