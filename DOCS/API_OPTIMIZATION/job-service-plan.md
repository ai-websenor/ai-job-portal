# API Response Optimization Plan — job-service

**Branch:** `krish/feat_api_optimization`
**Date:** 2026-07-08
**Frontends audited:** Web (`apps/job-board-web`), App (`apps/react-native-app`, local reference), Admin (`apps/admin-panel-web` — job moderation goes through admin-service, so job-service payloads are Web/App only)

**Standing rules:** ⚠️/ambiguous fields kept · unused endpoints kept · backend response-shape changes only, zero logic changes · type-declared frontend fields treated as ⚠️ (kept).

---

## 1. Module audit summary

| Module | Response shape | Verdict |
|---|---|---|
| `search` (search/trending/popular/featured/recent/similar + filters) | Full `jobs` row + relations per result | **TRIMMED `employer` relation — see §2.** `company` already lean (`{id, name, logoUrl}`), pagination fine. |
| `job` (details, my-jobs, saved list, share) | Same pattern | **TRIMMED `employer` relation** in `findById`, saved-jobs list, and the relations fetch (~line 1117). `my-jobs` (line ~649) was already explicit (`{id, firstName, lastName, userId}`) — untouched. `findById`'s `company` uses an explicit 18-column pick — untouched. |
| `jobs` row itself | Full row incl. `duplicateHash`, `trendingScore`, `popularityScore`, `relevanceScore`, `renewalCount`, `isCloned`, `clonedFromId`, `lastActivityAt`, `applicationEmail` | ⚠️ **Kept.** No runtime reads found, but every one of these is declared in web `types.ts` `IJob` → type-declared = keep per rules. `validityDays` IS runtime-read (job update form prefill). |
| `category` relation (`category: true`, full `jobCategories` row) | Only `.name` runtime-read | ⚠️ **Kept** — `IJobCategory` type-declared in web. |
| `saved-search` | Small row passthrough | No change. |
| `screening-question` | `employer: true` fetch is ownership-check only, never serialized | No change. |
| `job-analytics`, `job-deep-link` | Hand-built small objects (`{success}`, share links, counts) | No change. |
| `skill`, `category` services | Small master-data rows | No change. |

---

## 2. Implemented: employer object on job responses

Every job card/detail previously embedded the **full `employers` row** (`employer: true`) — in public candidate-facing search results. Replaced with explicit `employerPublicColumns` in `job.service.ts` (3 spots) and `search.service.ts` (7 spots).

### Kept (runtime-consumed)

| Field | Consumer |
|---|---|
| `firstName`, `lastName` | Web JobDetails/TrendingJobCard, RN SavedJobList/AppliedJobList |
| `email`, `phone` | Web job details "contact" section (phone currently commented but condition-checked) |
| `profilePhoto` | Web TrendingJobCard, RN job lists (logo fallback) |
| `department` | Web JobCard |
| `designation` | Paired with department (display) — kept |
| `id`, `userId`, `companyId`, `middleName` | Identity/navigation (RN uses `userId` for chat routing) |

### Removed (zero `employer?.X` reads in all three apps)

| Field | Note |
|---|---|
| `rbacRoleId` 🔒 | Internal RBAC pointer |
| `profileAccessNoticeAck` | Internal modal flag |
| `subscriptionPlan`, `subscriptionExpiresAt` | Employer's plan leaked to candidates viewing jobs |
| `isVerified`, `visibility`, `gender` | Internal/PII, unread |
| `createdAt`, `updatedAt` | Unread |

Payload effect: search/trending/popular return 10–20 jobs per page — this trims ~9 fields × N jobs per response and stops exposing employer subscription/RBAC state publicly.

**Note:** featured-jobs Redis cache (`jobs:featured`, 300s TTL) stores the fetched shape — old cached entries expire within 5 minutes of deploy; no invalidation needed.

## 3. Verification

- `pnpm exec tsc --noEmit` (job-service) — clean.
- Retest: candidate job search/trending/details (employer contact block renders), employer my-jobs table, RN saved/applied job lists (company-name fallback via employer firstName/lastName).
