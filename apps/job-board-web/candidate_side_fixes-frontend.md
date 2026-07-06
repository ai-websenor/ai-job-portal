# Candidate Side Fixes — Frontend

All calls go through the API Gateway (the `http` client already points to it).

**Backend status per fix:**

| # | Fix | Backend | Frontend |
|---|-----|---------|----------|
| 1 | Back button on `/my-applications` | n/a | ✅ needed |
| 2 | Status filter tabs on `/my-applications` (All \| Applied \| Viewed \| Shortlisted \| Rejected \| Selected) | ✅ already supported | ✅ needed |
| 3 | Save-Job button loader leaking into Apply button | n/a | ✅ needed |
| 4 | Back button on `/saved-jobs` and `/job-alerts` | n/a | ✅ needed |
| 5 | Date-range filter on `/saved-jobs` (Today \| This Week \| This Month \| This Year) | ✅ **implemented in this change** | ✅ needed |

---

## Fix 1 — Add a "Go Back" button on `/my-applications`

**Page:** `src/app/(main)/my-applications/page.tsx`

The employer page `src/app/(main)/employee/all-applications/page.tsx` already has a back button at the top of the header. Add the **same** button, same placement/styling, to the candidate `/my-applications` page.

- Copy the exact back-button markup from `employee/all-applications/page.tsx` (icon + `router.back()` or `router.push(routePaths...)`).
- Place it above/left of the page title so the layout matches the employer side.

Frontend-only. No API change.

---

## Fix 2 — Status filter tabs on `/my-applications`

**Page:** `src/app/(main)/my-applications/page.tsx`

Mirror the employer filter UI from `employee/all-applications/page.tsx`. Tabs to show, in order:

```
All | Applied | Viewed | Shortlisted | Rejected | Selected
```

### Backend — already supported, no change needed

The list endpoint already accepts a `status` query param:

```
GET /applications/my-applications?page=1&limit=20&status=<status>
```
(`ENDPOINTS.CANDIDATE...LIST` = `/applications/my-applications`)

`status` accepts any application status value. Map the tab label → query value exactly like the employer page does:

| Tab label   | `status` value sent |
|-------------|---------------------|
| All         | *(omit the param)*  |
| Applied     | `applied`           |
| Viewed      | `viewed`            |
| Shortlisted | `shortlisted`       |
| Rejected    | `rejected`          |
| **Selected**| `hired`             |

> ⚠️ **"Selected" maps to `hired`** — same mapping the employer page already uses
> (`employee/all-applications/page.tsx`: `if (status === 'selected') return 'hired'`).
> Keep it consistent so both sides behave identically.

### Frontend work
- Add the tabs (reuse the employer page's `Tabs`/`Tab` component + styling).
- On tab change, set the active status and refetch the list with the mapped `status` param (omit param for "All").
- Reset to page 1 when the tab changes.
- Response shape is unchanged: `{ data: [...], pagination: { totalApplications, pageCount, currentPage, hasNextPage } }`.

---

## Fix 3 — Save-Job button shows loader on the Apply button too

**File:** `src/app/components/cards/JobCard.tsx`

### The bug
There is a **single** shared loading state used by both action buttons:

```tsx
const [loading, setLoading] = useState(false);      // line ~40
```

Both `toggleJobSave()` and `quickApply()` call `setLoading(true/false)`, and both buttons read the same flag:

```tsx
// Quick Apply / Applied button
isLoading={loading}   // line ~258
...
// Save (bookmark) button
isLoading={loading}   // line ~274
```

So clicking **Save Job** flips `loading`, and the **Quick Apply / Applied** button spins at the same time (and vice-versa).

### The fix
Use two independent loading states, one per action:

```tsx
const [savingJob, setSavingJob] = useState(false);
const [applying, setApplying] = useState(false);
```

- In `toggleJobSave()` → use `setSavingJob(true/false)`.
- In `quickApply()` → use `setApplying(true/false)`.
- Quick Apply button → `isLoading={applying}`.
- Save (bookmark) button → `isLoading={savingJob}`.

Also check **`SavedJobCard.tsx`** and **`SavedJobsWidget.tsx`** for the same shared-loader pattern and apply the same split if present.

---

## Fix 4 — Add "Go Back" button on `/saved-jobs` and `/job-alerts`

**Pages:**
- `src/app/(main)/saved-jobs/page.tsx`
- `src/app/(main)/job-alerts/page.tsx`

Add the same back button as Fix 1 (reuse the exact component/markup from `employee/all-applications/page.tsx`) at the top of each page header. Frontend-only.

---

## Fix 5 — Date-range filter on `/saved-jobs`

**Page:** `src/app/(main)/saved-jobs/page.tsx`

Add quick-filter buttons: **Today | This Week | This Month | This Year** (plus an "All" / clear state). Filtering is by **when the job was saved**.

### Backend — implemented in this change

The saved-jobs endpoint now accepts optional `fromDate` / `toDate` ISO-8601 params:

```
GET /jobs/user/saved?fromDate=<ISO>&toDate=<ISO>&search=<optional>
```
(`ENDPOINTS...SAVED` = `/jobs/user/saved`)

- Both params are optional and inclusive.
- Filter is applied on the saved-job record's `createdAt` (the moment the candidate saved the job).
- `fromDate` / `toDate` combine with the existing `search` param.
- Response shape is unchanged (flat job objects with `isSaved`, `isApplied`, etc.).

### Computing the ranges on the client

Compute `fromDate` (and where noted `toDate`) from **now**, send as ISO strings. Recommended (send `fromDate` only, let "now" be the upper bound — omit `toDate`):

| Button      | `fromDate`                                   | `toDate`   |
|-------------|----------------------------------------------|------------|
| Today       | start of today (00:00:00 local)              | *(omit)*   |
| This Week   | start of current week (e.g. Monday 00:00:00) | *(omit)*   |
| This Month  | 1st of current month, 00:00:00               | *(omit)*   |
| This Year   | Jan 1 of current year, 00:00:00              | *(omit)*   |
| All         | *(omit both — clears filter)*                | *(omit)*   |

Example:
```ts
const now = new Date();

// Today
const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
// This Month
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
// This Year
const startOfYear = new Date(now.getFullYear(), 0, 1);

// send: fromDate: startOfToday.toISOString()
```

> Dates are compared on the server as absolute timestamps. Sending a local-midnight
> `Date` via `.toISOString()` (which converts to UTC) is correct — do **not** manually
> strip the timezone.

### Frontend requirements
- Only one range active at a time (toggle group). Selecting "All" clears `fromDate`/`toDate`.
- Refetch saved jobs whenever the active range changes (add it to the fetch deps).
- Keep the existing `search` filter working alongside the date range (send both params together).
