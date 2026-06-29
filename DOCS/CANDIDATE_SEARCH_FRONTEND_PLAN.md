# Candidate Search (Employer) — Frontend Implementation Plan

**Scope:** Frontend only — **Web** (`apps/job-board-web`, Next.js 16 / React 19) **and React Native** (mobile app).
**Backend:** Already complete. 4 employer-only endpoints live on `user-service`, reached via API Gateway `:3000`.
**Audience:** Employers / super-employers only (JWT role-gated; non-employer tokens get `403`).

---

## 1. Overview & Flow

```
Employer logs in (employer / super_employer role)
        │
        ▼
Opens "Search Candidates" page
        │
   ┌────┴───────────────────────────────────────┐
   │ Left: Filter sidebar     Right: Result list │
   └────┬───────────────────────────────────────┘
        │
        ├─ User types in search box / picks filters
        │       │
        │       ▼  (debounced 400ms)  →  GET /candidates/search?<params>
        │                                  returns { data[], pagination }
        │
        ├─ Each candidate card shows isSaved → filled/empty bookmark icon
        │       │
        │       ├─ Click "Save"  →  POST /candidates/saved { profileId, note? }   → set isSaved=true
        │       └─ Click "Unsave"→  DELETE /candidates/saved/:profileId           → set isSaved=false
        │
        ├─ Scroll / paginate  →  GET /candidates/search?page=2...  (append or replace)
        │
        └─ "Saved Candidates" tab  →  GET /candidates/saved?page=1&limit=10
```

**Two screens / tabs:**
1. **Search** — filters + paginated results.
2. **Saved (Shortlist)** — list of candidates the employer saved (same card shape, all `isSaved: true`).

---

## 2. API Reference

All routes go through the **API Gateway**: base URL `http://localhost:3000/api/v1` (dev). Prod uses the deployed gateway host. Every request needs `Authorization: Bearer <accessToken>`.

> Gateway strips and re-adds `X-User-Id` / `X-User-Role` — frontend only sends the Bearer token.

### 2.1 `GET /candidates/search` — Search candidates

**Auth:** employer / super_employer. **Method:** GET. **Params:** query string.

| Param | Type | Multi? | Allowed values | Notes |
|-------|------|--------|----------------|-------|
| `query` | string | no | free text | searches name, headline, skill name, job title (case-insensitive, partial) |
| `location` | string | no | free text | matches city/state/country (partial) |
| `experienceLevels` | CSV string | **yes** | `0-1`, `1-2`, `3-5`, `5-10`, `10+` | e.g. `3-5,5-10` |
| `salaryMin` | number | no | LPA (e.g. `6`) | candidate's max expected ≥ this |
| `salaryMax` | number | no | LPA (e.g. `15`) | candidate's min expected ≤ this |
| `employmentTypes` | CSV string | **yes** | `full_time`, `part_time`, `contract`, `internship` | |
| `availability` | CSV string | **yes** | `immediate`, `15d`, `30d`, `notice` | notice-period buckets |
| `skillIds` | CSV string | **yes** | skill UUIDs | exact skill match |
| `sortBy` | string | no | `relevance` (default), `recent`, `experience`, `salary` | |
| `page` | number | no | default `1` | |
| `limit` | number | no | default `10` | page size |

**Multi-value rule:** join with commas. **Do NOT** send repeated keys (`?experienceLevels=3-5&experienceLevels=5-10`) — backend `Transform` splits on `,`. Correct: `?experienceLevels=3-5,5-10`.

**Example request:**
```
GET /api/v1/candidates/search?query=React%20Developer&location=Bangalore&experienceLevels=3-5,5-10&salaryMin=6&salaryMax=20&employmentTypes=full_time&availability=immediate,15d&sortBy=relevance&page=1&limit=10
Authorization: Bearer <token>
```

**Response `200`:**
```json
{
  "message": "Candidates fetched successfully",
  "data": [
    {
      "profileId": "uuid",
      "name": "Asha Menon",
      "headline": "Senior React Developer",
      "location": "Bangalore, Karnataka",
      "profilePhoto": "https://s3-signed-url... (or null)",
      "totalExperienceYears": "5",
      "expectedSalaryMin": "1200000",
      "expectedSalaryMax": "1800000",
      "salaryCurrency": "INR",
      "noticePeriodDays": 15,
      "availability": "Within 15 Days",
      "skills": ["React", "TypeScript", "Node.js"],
      "isSaved": false
    }
  ],
  "pagination": {
    "totalCandidate": 134,
    "pageCount": 14,
    "currentPage": 1,
    "hasNextPage": true
  }
}
```

**Field notes for UI:**
- `profilePhoto` — pre-signed S3 URL or `null` → render avatar/initials fallback.
- `totalExperienceYears`, `expectedSalaryMin/Max` are **strings** (numeric/decimal) → parse before formatting. Salary is raw amount in `salaryCurrency` (NOT LPA) — divide by 100000 for "X LPA" display if INR.
- `availability` — pre-formatted label: `Immediate Joiner` / `Within 15 Days` / `Within 30 Days` / `Notice Period` / `Not specified`.
- `isSaved` — drives bookmark icon state.
- Any field can be `null` — guard all renders.

### 2.2 `POST /candidates/saved` — Save / shortlist a candidate

**Body:**
```json
{ "profileId": "uuid", "note": "Strong React profile, follow up" }
```
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `profileId` | UUID | yes | must be valid UUID |
| `note` | string | no | max 1000 chars |

**Idempotent** — saving an already-saved candidate updates the note, no error.

**Response `201`:**
```json
{ "message": "Candidate saved successfully", "data": { "profileId": "uuid" } }
```
**Errors:** `404` candidate profile not found · `400` employer profile not found · `403` wrong role.

### 2.3 `DELETE /candidates/saved/:profileId` — Unsave

**Response `200`:**
```json
{ "message": "Candidate removed from saved list", "data": { "profileId": "uuid" } }
```
**Errors:** `404` not in saved list · `403` wrong role.

### 2.4 `GET /candidates/saved` — List saved candidates

**Params:** `page` (default 1), `limit` (default 10).
**Response `200`:** same shape as search; `message: "Saved candidates fetched successfully"`. Every row `isSaved: true`.

---

## 3. Pagination Structure

Backend is **offset/page based**. Response `pagination`:

| Field | Meaning |
|-------|---------|
| `totalCandidate` | total matching rows (across all pages) |
| `pageCount` | total pages = ceil(total / limit) |
| `currentPage` | echoed page |
| `hasNextPage` | `currentPage < pageCount` |

**Web pattern (numbered pager or "Load more"):**
- Numbered: render `pageCount` pages, request `page` on click, **replace** list.
- Load-more: increment `page` while `hasNextPage`, **append** to list.

**React Native pattern (infinite scroll):**
- `FlatList` `onEndReached` → if `hasNextPage` and not already loading → fetch `currentPage + 1` → append.
- Guard double-fire with an `isFetchingMore` flag.

---

## 4. Filter Handling

### 4.1 Filter state shape (single source of truth)
```ts
type CandidateFilters = {
  query: string;
  location: string;
  experienceLevels: string[];   // ['3-5','5-10']
  salaryMin?: number;           // LPA
  salaryMax?: number;           // LPA
  employmentTypes: string[];    // ['full_time']
  availability: string[];       // ['immediate','15d']
  skillIds: string[];           // [uuid,...]
  sortBy: 'relevance' | 'recent' | 'experience' | 'salary';
  page: number;
  limit: number;
};
```

### 4.2 Serialize filters → query string
Build params, **omit empty**, join arrays with comma:
```ts
function buildSearchParams(f: CandidateFilters): string {
  const p = new URLSearchParams();
  if (f.query) p.set('query', f.query);
  if (f.location) p.set('location', f.location);
  if (f.experienceLevels.length) p.set('experienceLevels', f.experienceLevels.join(','));
  if (f.salaryMin != null) p.set('salaryMin', String(f.salaryMin));
  if (f.salaryMax != null) p.set('salaryMax', String(f.salaryMax));
  if (f.employmentTypes.length) p.set('employmentTypes', f.employmentTypes.join(','));
  if (f.availability.length) p.set('availability', f.availability.join(','));
  if (f.skillIds.length) p.set('skillIds', f.skillIds.join(','));
  if (f.sortBy) p.set('sortBy', f.sortBy);
  p.set('page', String(f.page));
  p.set('limit', String(f.limit));
  return p.toString();
}
```

### 4.3 Filter UI controls → param
| Sidebar control | UI element | Param | Values |
|-----------------|-----------|-------|--------|
| Search box | text input | `query` | free text |
| Location | text input / autocomplete | `location` | free text |
| Experience | checkbox group (multi) | `experienceLevels` | `0-1`,`1-2`,`3-5`,`5-10`,`10+` |
| Expected salary | range slider / two inputs | `salaryMin`,`salaryMax` | LPA numbers |
| Employment type | checkbox group (multi) | `employmentTypes` | `full_time`,`part_time`,`contract`,`internship` |
| Availability | checkbox group (multi) | `availability` | `immediate`,`15d`,`30d`,`notice` |
| Skills | multi-select / chips | `skillIds` | skill UUIDs |
| Sort | dropdown | `sortBy` | `relevance`,`recent`,`experience`,`salary` |

**Display labels (map for chips/checkboxes):**
- Experience: `0-1`→"0–1 yr", `1-2`→"1–2 yrs", `3-5`→"3–5 yrs", `5-10`→"5–10 yrs", `10+`→"10+ yrs"
- Employment: `full_time`→"Full Time", `part_time`→"Part Time", `contract`→"Contract", `internship`→"Internship"
- Availability: `immediate`→"Immediate", `15d`→"Within 15 Days", `30d`→"Within 30 Days", `notice`→"Serving Notice"

### 4.4 Filter behavior rules
- **Any filter change → reset `page` to 1** before refetch.
- **Debounce** `query` and `location` text inputs (~400ms). Checkboxes/sliders can fire on commit (slider: on release).
- **Active filter chips** above results; each chip × removes one value from the relevant array → refetch.
- **"Clear all"** resets filters to defaults, `page=1`.
- Multi-select removes a single token by filtering the array, not re-sending the whole list as repeated keys.
- (Optional) sync filters to URL query string on web for shareable/back-button state.

---

## 5. Skills filter (`skillIds`)

`skillIds` needs **UUIDs**, not skill names. Source the skill list from the existing skill endpoint (user-service `skill` module — confirm path, likely `GET /skills` or `GET /candidates/skills`). Frontend shows skill **names**, sends selected **ids**. If no public skill-list endpoint is wired for employers yet, flag as a backend follow-up (a `GET /candidates/search/filters` options endpoint was deferred on the backend).

---

## 6. Implementation Phases

> Mirror these for **both** web and React Native. Reuse the same API client + type definitions where the codebases allow (types can be copied/shared).

| Phase | Title | Web | RN | Status | % |
|-------|-------|-----|----|--------|---|
| 1 | Types + API client (4 endpoints) | ☐ | ☐ | ⬜ | 0% |
| 2 | Filter state store (Zustand) + serializer | ☐ | ☐ | ⬜ | 0% |
| 3 | Search page layout (sidebar + result list) | ☐ | ☐ | ⬜ | 0% |
| 4 | Candidate card component (+ avatar/salary/availability formatting) | ☐ | ☐ | ⬜ | 0% |
| 5 | Filter controls (all 8) + active chips + clear | ☐ | ☐ | ⬜ | 0% |
| 6 | Pagination (web pager / RN infinite scroll) | ☐ | ☐ | ⬜ | 0% |
| 7 | Save / Unsave (optimistic isSaved toggle) | ☐ | ☐ | ⬜ | 0% |
| 8 | Saved Candidates tab/screen | ☐ | ☐ | ⬜ | 0% |
| 9 | Loading / empty / error / 403 states | ☐ | ☐ | ⬜ | 0% |
| 10 | Debounce, URL sync (web), polish | ☐ | ☐ | ⬜ | 0% |

Status legend: ⬜ Not started · 🟡 In progress · ✅ Completed

---

## 7. State management

- **Web:** Zustand store `useCandidateSearchStore` (matches existing `src/store/` pattern) holding `filters`, `results`, `pagination`, `loading`, `error`. Data fetching can use the existing API route handler / axios client. Optionally TanStack Query for caching if already used elsewhere.
- **React Native:** same store shape; `FlatList` for results; pull-to-refresh resets to `page=1`.

### Save toggle (optimistic)
```ts
// optimistic: flip isSaved immediately, revert on error
async function toggleSave(card) {
  const prev = card.isSaved;
  setSaved(card.profileId, !prev);            // optimistic UI
  try {
    if (prev) await api.delete(`/candidates/saved/${card.profileId}`);
    else      await api.post('/candidates/saved', { profileId: card.profileId });
  } catch (e) {
    setSaved(card.profileId, prev);           // revert
    toastError('Could not update saved list');
  }
}
```

---

## 8. Edge cases & UX states

- **Empty results** — `data: []`, show "No candidates match your filters" + clear-filters CTA.
- **403** (non-employer) — guard route; show access-denied / redirect.
- **401** (token expired) — run existing refresh-token flow, retry once.
- **Null fields** — every card field optional → fallbacks (initials avatar, "—" salary, "Not specified" availability).
- **Salary formatting** — value is raw currency amount, not LPA. INR: `₹${(n/100000).toFixed(1)} LPA`. Respect `salaryCurrency`.
- **Loading** — skeleton cards (web) / spinner footer for load-more (RN).
- **Debounced search** — cancel in-flight request on new keystroke (AbortController).
- **isSaved sync** — after save/unsave on Search tab, Saved tab is stale → refetch saved list on focus.

---

## 9. Open items / backend follow-ups

- **Skill options source** for `skillIds` — confirm employer-accessible skill list endpoint.
- **Filter option lists** (`/candidates/search/filters`) — deferred on backend; frontend currently hardcodes enum labels from §4.3. Fine for now.
- **Facet counts** (numbers next to each filter) — backend deferred, do not build.
- **Candidate detail view** (click card → full profile) — confirm which existing profile endpoint employers use; out of scope for this plan unless specified.

---

## 10. Quick file map (suggested)

**Web (`apps/job-board-web/src/`):**
```
store/candidateSearchStore.ts        # filters + results + pagination
api/candidateSearch.ts               # 4 endpoint calls + buildSearchParams
types/candidateSearch.ts             # request/response types
app/(main)/candidates/search/page.tsx
app/(main)/candidates/saved/page.tsx
components/candidate-search/FilterSidebar.tsx
components/candidate-search/CandidateCard.tsx
components/candidate-search/ActiveFilterChips.tsx
components/candidate-search/Pagination.tsx
```

**React Native (mirror under app's structure):**
```
store/candidateSearchStore.ts
api/candidateSearch.ts
types/candidateSearch.ts
screens/CandidateSearchScreen.tsx    # FlatList + filter sheet
screens/SavedCandidatesScreen.tsx
components/CandidateCard.tsx
components/FilterBottomSheet.tsx      # filters in a modal/sheet on mobile
```

---

## Reference
- Backend plan: `DOCS/CANDIDATE_SEARCH_PLAN.md`
- Backend source: `apps/user-service/src/candidate-search/`
- Existing search UI blueprint (job search): `apps/job-board-web/src/app/(main)/` job search page + store
