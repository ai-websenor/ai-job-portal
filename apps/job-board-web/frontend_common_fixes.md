# Frontend Common Fixes — Employer Jobs Page

**Target page:** `src/app/(main)/employee/jobs/JobsListTable.tsx`
**API base:** all calls go through the API Gateway (`http` client already points to it).

Backend for Fix 1 & 2 is **already implemented and deployed**. Frontend just needs to wire up the UI. Fix 3 is frontend-only.

---

## Fix 1 — Add "Created By" filter dropdown

Filter the jobs list by the employer (creator) who created each job. Only meaningful for **super_employer / company-scope** users (users with `company-jobs:read` permission) — for a normal employer the creators list comes back empty, so hide the dropdown when the list is empty.

### Placement
Right **after** (right side of) the existing **"All Categories"** dropdown, same row, same styling as the other `Select` filters.

### Data source (new endpoint)
```
GET /jobs/employer/company-creators
```
Response:
```json
{
  "message": "Company job creators fetched successfully",
  "data": [
    { "id": "bc3806d8-...", "firstName": "Madav", "lastName": "Chopra" },
    { "id": "a1b2c3d4-...", "firstName": "Priya", "lastName": "Sharma" }
  ]
}
```
- `data` is the **distinct** list of employers who have created at least one job in the company.
- Empty array `[]` when the user is not company-scope → **do not render** the dropdown in that case.

Add to `endpoints.ts` under `EMPLOYER.JOBS`:
```ts
COMPANY_CREATORS: '/jobs/employer/company-creators',
```

### Applying the filter
Add query param `createdBy` (the employer **id**) to the existing list call:
```
GET /jobs/employer/my-jobs?page=1&limit=20&createdBy=<employerId>
```
Backend already accepts `createdBy` and filters `jobs.employerId = createdBy`.

### Dropdown requirements
- **Searchable** dropdown (type-to-filter inside the list). HeroUI `Autocomplete` supports this out of the box — prefer `Autocomplete` over `Select` here since search-in-dropdown is required.
- Option label = `${firstName} ${lastName}` (trim, fall back gracefully if either null).
- Option value/key = `id`.
- Include an "All Creators" / clear state (empty selection → omit `createdBy` param).
- Reset it in `resetFilters()` alongside `searchQuery`, `jobStatus`, `categoryId`.
- Add `createdBy` to the `getJobs` params object and to the `useEffect` dependency array that triggers `getJobs`.

### Implementation sketch
```tsx
const [createdBy, setCreatedBy] = useState('');
const [creators, setCreators] = useState<{ id: string; firstName: string; lastName: string }[]>([]);

// load once on mount (same pattern as loadCategories)
useEffect(() => {
  (async () => {
    try {
      const res: any = await http.get(ENDPOINTS.EMPLOYER.JOBS.COMPANY_CREATORS);
      setCreators(res?.data ?? []);
    } catch (e) { console.log(e); }
  })();
}, []);

// include in getJobs params:
...(params?.createdBy ? { createdBy: params.createdBy } : {}),

// include in the getJobs-triggering useEffect deps: [..., createdBy]

// render only when creators.length > 0, right of "All Categories":
{creators.length > 0 && (
  <div className="min-w-[180px] flex-1 lg:max-w-[260px]">
    <Autocomplete
      label="Created By"
      labelPlacement="outside"
      placeholder="All Creators"
      selectedKey={createdBy || null}
      onSelectionChange={(key) => {
        setCreatedBy(key ? String(key) : '');
        setPage(1);
      }}
    >
      {creators.map((c) => (
        <AutocompleteItem key={c.id}>
          {`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()}
        </AutocompleteItem>
      ))}
    </Autocomplete>
  </div>
)}
```

---

## Fix 2 — Search box: also search by employer name

The existing "Search by job title" box must **also match the creator employer name** (first or last name).

### Backend
Already done. The same `search` query param on `GET /jobs/employer/my-jobs?search=<term>` now matches **job title OR creator first/last name** (case-insensitive, partial). No new endpoint or param.

### Frontend
- Only change the **placeholder / label** text of the search input from `Search by job title` to something like:
  `Search by job title or employer name`
- No logic change — the existing `search` param wiring already works.

---

## Fix 3 — Replace inline action icons with a "more" (three-dot) menu

**Frontend-only. No backend involved.**

Currently the actions column renders all icons inline (forward/share job, edit job, delete job — plus publish where applicable). This causes an **alignment issue** in the row.

### Change
- Replace the inline row of icons with a **single vertical three-dot icon** (`BsThreeDotsVertical` from `react-icons/bs`, or `HiDotsVertical`).
- On click, open a **HeroUI `Dropdown`** menu listing the actions as **text items laid out horizontally** (a horizontal list of labelled actions), e.g.: `Share` · `Edit` · `Delete` (and `Publish` when the job is publishable).
- Preserve existing behavior/handlers exactly:
  - Share → `handleShareJob(job)`
  - Edit → navigate to job update route (`routePaths` edit path already used)
  - Delete → opens the existing `ConfirmationDialog` (`setDeleteModal({ show: true, id })`)
  - Publish → existing `PublishJobButton` logic/condition
- Keep the **same permission/role gating** currently applied per icon (e.g. edit/delete visibility). Only render menu items the user is allowed to use.
- The three-dot trigger should be centered in the `actions` column (column is already `align: 'center'`).

### Notes
- Do not remove `PublishJobButton` logic — move its action/condition into the menu, or keep it as a menu item that renders conditionally.
- This is purely a layout/UX refactor of the actions cell; the list query is unchanged.

---

## Fix 4 — Loaders on all data tables (`/employee/interviews` and similar pages)

**Frontend-only. No backend involved.**

### Problem
Tables (interview listing, member listing, application listing, etc.) show stale rows or blank space while data is being (re)fetched — especially on **filter/dropdown changes**, where nothing indicates a request is in flight.

### Requirements
1. **One shared loader component**, imported everywhere — do not hand-roll per-page spinners. There is already `LoadingProgress` (`src/app/components/lib/LoadingProgress.tsx`) used by the jobs table; standardize on it (or extend it) rather than adding a new one.
2. **Every data fetch shows the loader**, including:
   - Initial page load
   - Pagination changes (page / page size)
   - **Every filter change**: dropdown selections (status, type, mode, created-by, category…), date range changes, search input (after debounce fires)
   - Refetch after mutations (delete, reschedule, cancel → list reload)
3. **Graceful handling**:
   - Always clear loading in `finally` (pattern already used in `JobsListTable.getJobs`) so a failed request never leaves an infinite spinner.
   - While loading, either overlay the table area or replace rows — but keep the table header/filters visible and interactive layout stable (no jump).
   - Show empty-state message only when `!loading && rows.length === 0` — never show "No data found" while a fetch is running (common bug on filter change).
4. **Positioning**: loader must be **centered in the section it loads** — center of the table/card area (not top-left, not the whole viewport unless it's a full-page load). Simple approach:
   ```tsx
   {loading ? (
     <div className="flex min-h-[300px] w-full items-center justify-center">
       <LoadingProgress />
     </div>
   ) : (
     <Table>…</Table>
   )}
   ```
   For overlay style (table stays visible, dimmed):
   ```tsx
   <div className="relative">
     {loading && (
       <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
         <LoadingProgress />
       </div>
     )}
     <Table>…</Table>
   </div>
   ```

### Pages to audit (minimum)
- `/employee/interviews` — `InterviewListTable.tsx` (both employer and candidate views)
- `/employee/members` — `MembersListTable.tsx`
- `/employee/all-applications`
- `/employee/jobs` — verify existing loader also covers filter-change refetches
- Any other table using the fetch-in-`useEffect` pattern

---

## Fix 5 — Standardize date/time pickers (single common component)

**Frontend-only. No backend involved. High priority.**

### Problem
Different pages use different/inconsistent date, month, year, and time pickers; some force manual typing. Need one consistent, low-typing picker set used everywhere.

### Recommended library: **HeroUI date components** (already in the stack)
The app already uses `@heroui/react` — it ships `DatePicker`, `DateRangePicker`, `TimeInput`, and `Calendar`, all built on `@internationalized/date` + React Aria. **Do not add react-datepicker / MUI / antd** — that would drag in a second design system and duplicate styling. HeroUI pickers match existing form styling (`label`, `labelPlacement="outside"`, `classNames`) out of the box.

Install peer dep if not present:
```bash
npm i @internationalized/date
```

### What to build: common wrapper components in `src/app/components/lib/`
Create thin wrappers so every page imports the same components and behavior is controlled by props ("control by attributes"):

1. **`AppDatePicker.tsx`** — wraps HeroUI `DatePicker`
2. **`AppDateRangePicker.tsx`** — wraps HeroUI `DateRangePicker` (for from/to filters like interview date range)
3. **`AppTimePicker.tsx`** — wraps HeroUI `TimeInput` (or `DatePicker` with `granularity="minute"` when date+time together)

### Required props/behaviors (each wrapper)
| Prop | Purpose |
|------|---------|
| `value` / `onChange` | controlled value (use `@internationalized/date` types; convert to ISO/dayjs at the boundary) |
| `minDate` / `maxDate` | maps to `minValue`/`maxValue` — e.g. disable past dates when scheduling interviews |
| `isDisabled`, `isReadOnly`, `isRequired` | pass-through enable/disable control |
| `granularity` | `day` / `hour` / `minute` — one component covers date-only and date+time |
| `showMonthAndYearPickers` | `true` by default — fast month/year jump instead of clicking arrows (removes the need for separate month/year pickers) |
| `label`, `placeholder`, `errorMessage` | consistent form styling with the rest of the app |
| `isClearable` / clear button | **required** — see below |

### Clear support (mandatory)
Every picker must let the user clear the selected date/time. HeroUI `DatePicker` supports `onChange(null)`; render a small clear (`×`) button via `endContent`/`selectorButtonPlacement` area when `value != null`:
```tsx
<DatePicker
  value={value}
  onChange={onChange}
  endContent={
    value != null && (
      <button type="button" onClick={() => onChange(null)} aria-label="Clear date">
        <IoClose />
      </button>
    )
  }
/>
```

### Reduce manual typing
- Calendar popover is the primary input; segments allow keyboard entry but never require it.
- `showMonthAndYearPickers` for fast year/month navigation (DOB fields, experience dates).
- For date+time (interview scheduling), use ONE `AppDatePicker` with `granularity="minute"` — not separate date + free-text time inputs.
- Use `hideTimeZone` and default `hourCycle={12}` for user-facing times.

### Migration
Replace ad-hoc pickers/inputs everywhere, minimum:
- Interview schedule/reschedule forms (date + time)
- Interview list date-range filters (`fromDate`/`toDate`) → `AppDateRangePicker`
- Job form deadline field
- Profile education/experience/certification date fields (month/year → `AppDatePicker` with `granularity="day"` + month/year pickers, or a month-only preset prop)
- Any raw `<input type="date">` / `<input type="time">`

Backend expects ISO 8601 strings (`fromDate`/`toDate`, `scheduledAt`, `deadline`) — convert at submit: `value.toDate(getLocalTimeZone()).toISOString()`.

---

## Fix 6 — Interviews search box: candidate name OR job role/position

**Backend done. Frontend wiring needed.**

Page: `/employee/interviews` — `InterviewListTable.tsx` + `InterviewsListFilters.tsx`.

### Backend change (already deployed)
`GET /interviews/list` accepts a new query param:

```
GET /interviews/list?search=<term>
```

- **Employer role**: matches **candidate first/last name OR job title/role** (case-insensitive, partial).
- **Candidate role**: matches **job title/role**.
- Old params `candidateName` and `jobName` still work unchanged (backward compatible) — but the single search box should now send `search` instead of `candidateName`.

### Frontend changes
1. `InterviewsListFilters.tsx`:
   - Rename filter state key `candidateName` → `search` (or keep the key and just change what param it maps to — but renaming is cleaner).
   - Placeholder: `search by candidate name...` → `Search by candidate name or job role...`
2. `InterviewListTable.tsx`:
   - Where params are built (`if (employerFilters.candidateName) params.candidateName = ...`) → send `params.search = employerFilters.search`.
   - Update the persisted-filters parsing (`parsed.candidateName ?? ''`) to the new key.
   - Keep the same debounce + the Fix 4 loader on this refetch.
3. No change needed for the separate "Search by job title or job ID" input if it serves a different purpose — but if both boxes now overlap, consider consolidating into the single `search` box (product call).

---

## Fix 7 — All Applications page (`/employee/all-applications`) improvements

Page: `src/app/(main)/employee/all-applications/page.tsx`
Endpoint: `GET /applications/employer/all-applications` (`ENDPOINTS.EMPLOYER.APPLICATIONS.ALL`)

### 7a. Date filter (quick buttons + custom range)

**Backend done.** Endpoint now accepts:

| Param | Type | Meaning |
|-------|------|---------|
| `fromDate` | ISO 8601 | applications applied **on or after** this date (inclusive) |
| `toDate` | ISO 8601 | applications applied **on or before** this date (inclusive) |

Both optional; use either or both. Filters on `appliedAt`.

**UI requirements:**
- Quick-filter buttons: **Today**, **This Week**, **This Month**, **This Year** — plus a **custom date range** picker (use `AppDateRangePicker` from Fix 5).
- **Placement: left side of the search input box**, same filter row.
- Buttons behave as a single-select toggle group; selecting one computes the range and refetches; clicking again (or a Clear/"All" state) removes the filter.
- Custom range selection deselects any quick button; a quick button clears the custom range.
- Show the loader (Fix 4) on every change.

Range computation (dayjs already in the project):
```ts
import dayjs from 'dayjs';

const ranges = {
  today:      { fromDate: dayjs().startOf('day'),   toDate: dayjs().endOf('day') },
  this_week:  { fromDate: dayjs().startOf('week'),  toDate: dayjs().endOf('week') },
  this_month: { fromDate: dayjs().startOf('month'), toDate: dayjs().endOf('month') },
  this_year:  { fromDate: dayjs().startOf('year'),  toDate: dayjs().endOf('year') },
};
// send as ISO:
params.fromDate = range.fromDate.toISOString();
params.toDate   = range.toDate.toISOString();
```
Reset page to 1 on every date-filter change. Include `fromDate`/`toDate` in `resetFilters()`.

### 7b. Replace "Applied 8 days ago" with actual applied date

Application objects already return `appliedAt`. Replace relative text with the formatted date:
```ts
dayjs(application.appliedAt).format('DD MMM YYYY')   // e.g. "25 Jun 2026"
```
Prefix label stays: `Applied on 25 Jun 2026`. Apply everywhere the relative "applied X days ago" text appears (card list, detail views if present).

### 7c. Items/Page selector (this page + all listing pages)

- Add an **Items/Page** dropdown like the jobs listing page (`/employee/jobs`) already has.
- **Dropdown values: `5, 10, 15, 20`** — standardize these values on **all** items-listing pages (jobs, applications, interviews, members, etc.). Update the jobs page too if its current options differ.
- Changing page size → `limit` param, reset `page` to 1, refetch with loader.
- Endpoint already supports `page`/`limit` (default 20, max 100) — no backend change.
- Recommended: extract a small shared `ItemsPerPageSelect` component (or fold into the existing `TablePagination` component) so every page imports the same control with the same options.

### 7d. "Interview scheduled" status capsule

Status chips on application cards render with a capsule/pill border for known statuses, but **`interview_scheduled` is missing its style** and renders plain.

- Add `interview_scheduled` to the status→color/style mapping used by the application card status chip (check `CommonUtils.getStatusColor` / the chip variant logic — same path used for `applied`, `viewed`, `shortlisted`, `rejected`, etc.).
- Same capsule look: rounded-full bordered chip, distinct color (suggest primary/blue-ish to differ from shortlisted/hired greens).
- Label via existing `CommonUtils.keyIntoTitle('interview_scheduled')` → "Interview Scheduled".

Note: backend intentionally excludes `interview_scheduled` from the employer **status filter dropdown** options (`EMPLOYER_FILTER_STATUS_VALUES`) — this fix is only about **displaying** the status chip on cards, not the filter.

---

## Fix 8 — Members page (`/employee/members`) filter improvements

Page: `src/app/(main)/employee/members/MembersListTable.tsx`
Endpoint: `GET /company-employers` (`ENDPOINTS.EMPLOYER.MEMBERS.LIST`)

### 8a. "All" default option in the "All Status" dropdown

**Backend done.** The `status` param now accepts `all | active | inactive`:
- `status=all` → returns **both** active and inactive members (still company-scoped)
- `status=active` / `status=inactive` → as before
- omitted → active only (old default, unchanged)

**Frontend:**
- Add an **"All"** option to the status dropdown and make it the **default selection**.
- When "All" is selected, send `status=all` (do NOT omit the param — omitting means active-only).
- Dropdown options: `All` (default), `Active`, `Inactive`.
```tsx
{['all', 'active', 'inactive'].map((status) => ( ... ))}
// default: const [statusFilter, setStatusFilter] = useState('all');
// param building: always send status (it now has a value):
...(params?.status ? { status: params.status } : {}),
// resetFilters(): setStatusFilter('all');
```

### 8b. Inactive listing scoping

Backend `GET /company-employers?status=inactive` is **already company-scoped** (`users.companyId = <caller company>` is always applied; soft-delete keeps `companyId`). If globally-looking inactive members appear, the cause is frontend: the page mixes **static mock data** into the table/options (see 8c) — remove the mock fallbacks and rely only on API data. If after that inactive rows still look wrong, capture the request/response and report — but no backend change is expected here.

### 8c. Dynamic Designation / Department dropdown values

**Problem:** dropdowns currently merge hardcoded mock values (`membersData`, `departmentOptions` from `src/app/config/data.ts`) with only the **current page** of members — so options are stale/global and incomplete.

**Backend done.** New endpoint:
```
GET /company-employers/filter-options
```
Response:
```json
{
  "data": {
    "designations": ["HR Manager", "Recruiter", "Talent Acquisition Lead"],
    "departments": ["Engineering", "Human Resources", "Sales"]
  },
  "message": "Member filter options fetched successfully"
}
```
- Distinct, trimmed, alphabetically sorted, non-empty values across **all** employers of the company — i.e., exactly the values typed by super employer/employer in "Create New Member" (and edits).
- Add to `endpoints.ts` under `EMPLOYER.MEMBERS`:
```ts
FILTER_OPTIONS: '/company-employers/filter-options',
```

**Frontend:**
- Fetch once on mount (same pattern as categories on the jobs page); populate both dropdowns from `data.designations` / `data.departments`.
- **Delete** the `membersData` / `departmentOptions` mock imports and the `useMemo` merging logic.
- Filter params stay the same: `department=<exact value>`, `designation=<exact value>` (backend does exact match on the stored value).

### 8d. Search inside "All Departments" / "All Designations" dropdowns

Both dropdowns must support **type-to-search inside the dropdown**. Same approach as Fix 1: use HeroUI **`Autocomplete`/`AutocompleteItem`** instead of `Select`. Keep clearable (empty selection → omit the param).

### 8e. Date range filter after "All Designations"

**Backend already supports it** — `GET /company-employers` accepts:

| Param | Behavior |
|-------|----------|
| `fromDate` (ISO 8601 / `YYYY-MM-DD`) | members created **on or after** — backend normalizes to start of day |
| `toDate` | members created **on or before** — backend normalizes to end of day |

Filters on the member's `createdAt` (when the member was added).

**Frontend:**
- Add a **date range picker** (`AppDateRangePicker` from Fix 5) positioned **immediately right of the "All Designations" dropdown**, same filter row.
- Send `fromDate`/`toDate` on change; reset page to 1; show loader (Fix 4); clearable; include in `resetFilters()`.

---

## Summary of backend contract (for reference)
| Need | Method | Endpoint | Params |
|------|--------|----------|--------|
| Jobs list | GET | `/jobs/employer/my-jobs` | `page, limit, search, status, categoryId, createdBy` |
| Creators dropdown | GET | `/jobs/employer/company-creators` | — |
| Interviews list | GET | `/interviews/list` | `page, limit, status, interviewType, interviewMode, fromDate, toDate, candidateName, jobName, jobId, sortBy, sortOrder, `**`search`** |
| Employer applications | GET | `/applications/employer/all-applications` | `page, limit, search, status, `**`fromDate, toDate`** |
| Members list | GET | `/company-employers` | `page, limit, search, `**`status (all/active/inactive)`**`, isVerified, department, designation, fromDate, toDate, sortOrder` |
| Members filter options | GET | `/company-employers/filter-options` | — |

- Jobs `search` matches title **or** employer name. `createdBy` = employer id filter (company scope).
- Interviews `search` matches candidate name (employer) **or** job title/role.
- Applications `fromDate`/`toDate` filter on `appliedAt` (inclusive, ISO 8601).
- Members `fromDate`/`toDate` filter on member `createdAt`; `filter-options` returns distinct company designations/departments.
