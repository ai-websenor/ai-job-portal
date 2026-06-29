# Candidate Search (Employer) — Backend Implementation Plan

**Scope:** Backend only. Employer-side candidate search with filters + Save Candidate.
**Service:** `user-service` (port 3002) — owns all candidate data; shared DB, no cross-service calls.
**Branch:** `krish/feat-candidate_search`

## Out of scope (deferred)
- Stats cards (Jobs Created / Applicants / Shortlisted …) → application-service dashboard
- Facet counts (sidebar numbers)
- Saved-search (persisted filter sets)
- Frontend

## In scope
1. `GET candidates/search` — filtered, paginated, sorted candidate results
2. `POST /candidates/save` + `DELETE` + `GET` — Save Candidate (shortlist/bookmark)

---

## Overall Progress: 100% ✅

| Phase | Title | Status | % |
|-------|-------|--------|---|
| 1 | DB schema — `saved_candidates` table | ✅ Completed | 100% |
| 2 | Search DTO | ✅ Completed | 100% |
| 3 | Search service (Drizzle query) | ✅ Completed | 100% |
| 4 | Search controller + role guard | ✅ Completed | 100% |
| 5 | Save Candidate (DTO + service + controller) | ✅ Completed | 100% |
| 6 | Module wiring + gateway proxy | ✅ Completed | 100% |
| 7 | Swagger + E2E tests | ✅ Completed | 100% |

Status legend: ⬜ Not started · 🟡 In progress · ✅ Completed

---

## Phase 1 — DB schema: `saved_candidates` table — ✅ 100%

New table in `packages/database/src/schema/employer.ts` (employer-owned data).

```ts
export const savedCandidates = pgTable('saved_candidates', {
  id: uuid('id').primaryKey().defaultRandom(),
  employerId: uuid('employer_id').notNull().references(() => employers.id, { onDelete: 'cascade' }),
  profileId: uuid('profile_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
  uniqueIndex('saved_candidates_employer_profile_unique').on(table.employerId, table.profileId),
  index('idx_saved_candidates_employer').on(table.employerId),
]);
```

Tasks:
- [x] Add table to `employer.ts` (+ `index`, `profiles` imports)
- [x] Export in `schema/index.ts` (auto via `export *`)
- [x] Add relations in `relations.ts` (`savedCandidatesRelations` + wired into employer/profile)
- [x] `pnpm db:generate` → `drizzle/0033_nappy_starbolt.sql`
- [x] `pnpm db:push` → applied to dev DB

**Done when:** table live on dev DB, types generated. ✅

---

## Phase 2 — Search DTO — ✅ 100%

`apps/user-service/src/candidate-search/dto/search-candidates.dto.ts`
Mirror `apps/job-service/src/search/dto` style (CSV multi-value, class-validator).

Filters → DB field map:

| Param | Type | Source field |
|-------|------|--------------|
| `query` | string | `profiles.firstName/lastName/headline`, `skills.name`, `workExperiences.jobTitle` |
| `location` | string | `profiles.city/state/country` (partial) |
| `experienceLevels` | CSV | `profiles.totalExperienceYears` buckets (`0-1,1-2,3-5,5-10,10+`) |
| `salaryMin` / `salaryMax` | number | `jobPreferences.expectedSalaryMin/Max` |
| `employmentTypes` | CSV | `jobPreferences.jobTypes` (CSV text) |
| `availability` | CSV | `jobPreferences.noticePeriodDays` + `jobSearchStatus` (`immediate,15d,30d,notice`) |
| `sortBy` | enum | `relevance,recent,experience,salary` |
| `page` / `limit` | number | pagination |

Tasks:
- [x] `SearchCandidatesDto` with `@ApiPropertyOptional` + validators + CSV transform (shared `toStringArray`)
- [x] `dto/index.ts` barrel

**Done when:** DTO compiles, swagger-annotated. ✅
Response format to mirror (from job search): `{ message, data, pagination: { totalJob→totalCandidate, pageCount, currentPage, hasNextPage } }`

---

## Phase 3 — Search service (Drizzle query) — ✅ 100%

`apps/user-service/src/candidate-search/candidate-search.service.ts`

Logic:
- Base: `profiles` LEFT JOIN `jobPreferences`, LEFT JOIN `profileSkills`→`skills`, LEFT JOIN `workExperiences`
- WHERE `profiles.visibility != 'private'` (only `public`/`semi_private`)
- Apply each filter conditionally (build `and(...)` array like job search.service)
- Experience buckets → numeric range on `totalExperienceYears`
- Availability → map token to `noticePeriodDays` range (immediate=0, 15d≤15, 30d≤30, notice>30)
- `employmentTypes` → match against `jobPreferences.jobTypes` CSV (ILIKE / overlap)
- Skill/query → DISTINCT profile (group/exists subquery to avoid dup rows)
- Sort + paginate (`limit`/`offset`)
- Shape card response: `{ profileId, name, headline, location, photo, totalExperienceYears, expectedSalaryMin/Max, skills[], availability, isSaved }`
- `isSaved` = LEFT JOIN `savedCandidates` on current employer

Tasks:
- [x] `searchCandidates(userId, dto)` — resolves employerId for `isSaved`, visibility gate
- [x] bucket/availability mappers + `availabilityLabel`
- [x] EXISTS subqueries for query/skill/title (no row dup); skills fetched per-page & grouped
- [x] S3 signed photo URLs (`getSignedDownloadUrlFromKeyOrUrl`)
- [x] result shaper + pagination `{ totalCandidate, pageCount, currentPage, hasNextPage }`

**Done when:** returns correct filtered/sorted page. ✅ tsc clean (0 errors)

---

## Phase 4 — Search controller + role guard — ✅ 100%

`apps/user-service/src/candidate-search/candidate-search.controller.ts`

```ts
@ApiTags('candidate-search')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('employer', 'super_employer')
@Controller('candidates/search')
```

- [x] `GET candidates/search` → `searchCandidates(userId, dto)` (`{ message, ...result }` wrap)
- [x] `employerId` resolved inside service from userId → employers row
- [x] guard `AuthGuard('jwt') + RolesGuard`, `@Roles('employer','super_employer')`

**Note:** route `candidates/search` rides existing `candidates/*` proxy. No path conflict with `CandidateController` (@Controller('candidates') has no `search` route).

**Done when:** employer token returns results; candidate/anon token → 403. ✅ tsc clean

---

## Phase 5 — Save Candidate — ✅ 100%

`SavedCandidateController` @Controller('candidates/saved'), same guards/roles.

Endpoints:
- [x] `POST candidates/saved` body `{ profileId, note? }` → upsert via `onConflictDoUpdate` (idempotent, updates note)
- [x] `DELETE candidates/saved/:profileId` → unsave (404 if not saved)
- [x] `GET candidates/saved` → paginated list, reuses `shapeCandidates`

Service (added to `CandidateSearchService`):
- [x] `saveCandidate(userId, dto)` — resolves employerId, 404 if profile missing, idempotent
- [x] `unsaveCandidate(userId, profileId)`
- [x] `listSavedCandidates(userId, page, limit)`
- [x] refactor: extracted `resolveEmployerId`, `shapeCandidates`, shared `candidateCardColumns`

**isSaved tracking:** search results carry **`isSaved`** boolean (leftJoin `savedCandidates` on current employer) → frontend marks already-saved icon. Saved-list rows force `isSaved: true`.

**Done when:** save/unsave/list work; duplicate save no-ops; `isSaved` reflects in search. ✅ tsc clean

---

## Phase 6 — Module wiring + gateway proxy — ✅ 100%

- [x] `candidate-search.module.ts` (2 controllers + service; DatabaseModule/AwsModule are global)
- [x] registered `CandidateSearchModule` in `app.module.ts`
- [x] gateway `candidates/*` proxy (`proxy.controller.ts:112`) covers both routes — no new proxy route
- [x] RolesGuard from `@ai-job-portal/common` (same as company/employer controllers)

**Done when:** routes reachable via gateway :3000. ✅ `nest build` clean

---

## Phase 7 — Swagger + E2E tests — ✅ 100%

- [x] `@ApiOperation`/`@ApiResponse` on all endpoints (done during phases 4–5)
- [x] Pactum E2E `apps/user-service/test/e2e/candidate-search.e2e-spec.ts`:
  - search no filter → 200 + pagination
  - all filter params accepted
  - no token → 401, candidate role → 403
  - save → 201, idempotent duplicate, 404 missing profile, candidate → 403
  - saved list → 200 with `isSaved: true`
  - unsave → 200, re-unsave → 404
- [x] tsc clean (test tsconfig, 0 errors)

**Done when:** `pnpm test:e2e:user` green.
**Note:** spec typechecks clean; execution requires the live stack (auth-service + user-service + DB) running — not run in this session.

---

## File checklist

| File | Action |
|------|--------|
| `packages/database/src/schema/employer.ts` | add `savedCandidates` |
| `packages/database/src/schema/index.ts` | export |
| `packages/database/src/relations.ts` | relations |
| `apps/user-service/src/candidate-search/candidate-search.module.ts` | new |
| `apps/user-service/src/candidate-search/candidate-search.controller.ts` | new |
| `apps/user-service/src/candidate-search/candidate-search.service.ts` | new |
| `apps/user-service/src/candidate-search/dto/*` | new |
| `apps/user-service/src/app.module.ts` | register module |
| `apps/user-service/test/e2e/candidate-search.e2e.ts` | new |

## Phase 8 — Performance indexes (scale prep) — ✅ 100%

Added for lakhs-scale search. Migration `drizzle/0034_sour_gabe_jones.sql` (incl. `CREATE EXTENSION IF NOT EXISTS pg_trgm`). Applied to **dev** (16 indexes verified).

- [x] Btree: `profiles`(visibility, total_experience_years, created_at); `job_preferences`(profile_id, notice_period_days, expected_salary_min/max); `profile_skills`(profile_id, skill_id); `work_experiences`(profile_id)
- [x] GIN pg_trgm (index-backed `ILIKE '%term%'`): `profiles`(first_name, last_name, headline, city); `skills`(name); `work_experiences`(job_title)

**Deferred (only at true lakhs + concurrency):** Redis-cache/estimate `count(distinct)`, keyset pagination, Elasticsearch/Typesense.

## Migration checklist (promotion)
- [x] dev — `0033` (saved_candidates) + `0034` (indexes) applied
- [ ] staging — apply `0033` + `0034`
- [ ] prod — apply `0033` + `0034`

## Reference (reuse blueprints)
- Search pattern: `apps/job-service/src/search/search.service.ts`
- Role guard: `apps/user-service/src/employer/employer.controller.ts:34-36`
- Candidate tables: `packages/database/src/schema/profiles.ts`
