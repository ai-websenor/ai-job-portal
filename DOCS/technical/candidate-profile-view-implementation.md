# Candidate Profile View — Unified Employer Endpoint

**Status**: In implementation
**Date**: 2026-06-10
**Scope**: Backend only (user-service + application-service response parity). Frontend handled separately by the team.

## Problem

Employers see a "View Profile" button in two places:

1. **Applications list** — works via `GET /api/v1/applications/:applicationId/candidate-profile` (application-service)
2. **Candidate search** (new) — broken: search results only expose `profileId`, there is no `applicationId`, so the existing endpoint cannot be called. Button is currently disabled.

Both buttons must land on the same candidate profile page with the same response shape.

## Decisions (confirmed with product owner)

| Decision | Choice |
|----------|--------|
| Profile view from search | **Free** — no subscription check, no `resume_access` credit |
| Resume download | **Charged** — first download of a candidate consumes 1 `resume_access` credit (per employer user + candidate pair, tracked via `profile_views`) |
| `application` object when no `applicationId` passed | Auto-include the candidate's **latest application to the employer's company**, else `null` |
| `visibility` key | Added to `profile` object in both new and existing endpoints |
| Frontend | Not touched in this task — backend ships first, frontend integrates after |
| Existing `/applications/:id/candidate-profile` | Untouched in behavior (only `visibility` field added) — zero regression for applications-list and schedule pages |

## New Endpoints (user-service, candidate-search module)

Gateway already proxies `candidates/*` to user-service (`proxy.controller.ts:112`) — no gateway change needed.

### 1. `GET /api/v1/candidates/:profileId/profile?applicationId=<uuid optional>`

**Roles**: `employer`, `super_employer`

**Authorization rules**:

- Caller must have an employer record (`403 Employer profile required`).
- **With `applicationId`**: application must exist, must belong to this `profileId` (`jobSeekerId` matches `profiles.userId`), and the employer must own the job OR be in the same company with `company-applications:read` permission (same rules as the existing application-service endpoint, via `hasCompanyPermission` from `@ai-job-portal/common`). Visibility check is skipped — applying implies consent.
- **Without `applicationId`** (search context): profile must have `visibility != 'private'`, OR the candidate has at least one application to the employer's company/jobs. Private non-applicant profiles return `404` (not `403`) to avoid leaking existence to ID probing.

**No subscription check, no profile-view recording** (free view per product decision).

**Response shape** (mirrors existing application endpoint for frontend reuse):

```jsonc
{
  "profile": {
    "userId": "...",
    "firstName": "...", "lastName": "...", "email": "...", "phone": "...",
    "headline": "...", "professionalSummary": "...",
    "totalExperienceYears": "...",
    "city": "...", "state": "...", "country": "...",
    "profilePhoto": "<signed url|null>",
    "visibility": "public | private | ..."        // NEW key
  },
  "workExperiences": [],
  "educationRecords": [],
  "certifications": [],
  "skills": [{ "skillName": "...", "category": "...", ... }],
  "jobPreferences": {},
  "application": {                                  // null if candidate never applied to employer's company
    "applicationId": "...",
    "candidateId": "<profiles.id>",
    "jobId": "...", "jobTitle": "...",
    "status": "...", "appliedAt": "...",
    "resumeUrl": "...", "resumeId": "...",
    "coverLetter": "...",
    "threadId": "<message thread|null>"
  },
  "resume": {                                       // NEW — candidate's default resume metadata; null if none
    "id": "...",
    "fileName": "...", "resumeName": "...",
    "fileType": "pdf", "fileSize": 12345,
    "updatedAt": "...",
    "isDownloaded": false                           // true if this employer already spent a credit on this candidate
  },
  "videoResume": { "url": "<signed url>", "status": "approved" } // null unless approved
}
```

Notes:

- `resume` intentionally has **no download URL** — downloads are charged, so the URL is only issued by the download endpoint below.
- `application` selection without explicit `applicationId`: most recent `job_applications` row (by `appliedAt`) whose job belongs to the employer directly or to the employer's company.

### 2. `GET /api/v1/candidates/:profileId/resume`

**Roles**: `employer`, `super_employer`

Charged resume download. Flow:

1. Same access rule as profile view without `applicationId` (public OR applied) — prevents private-profile resume leak.
2. Resolve candidate's default resume (`isDefault` first, else most recently updated). `404` if none.
3. Check `profile_views` for `(employerId = userId, profileId)`:
   - Row exists → already paid → free download.
   - No row → require active subscription (`403` with upgrade message if none), `checkLimit('resume_access')`, then insert `profile_views` row + `incrementUsage('resume_access')`.
4. Return resume metadata + 1-hour signed S3 URL.

```jsonc
{
  "message": "Resume download URL generated",
  "data": {
    "id": "...", "fileName": "...", "resumeName": "...",
    "fileType": "pdf", "fileSize": 12345,
    "url": "<signed url, 1h expiry>"
  }
}
```

**Credit semantics**: `profile_views` row = "this employer user has paid resume access for this candidate". Consequence: if the employer later opens the same candidate via the application-based endpoint, `isFirstView` is false there and no second credit is charged — consistent, candidate already paid for.

**Known asymmetry (accepted)**: the old application-based endpoint charges a credit on first *view*; the new search-based flow charges on first *download*. An employer viewing an applicant via search pays nothing until download. Product owner accepted this; future alignment can move the old endpoint to charge-on-download too.

## Changes by file

### user-service

| File | Change |
|------|--------|
| `src/subscription/subscription.helper.ts` | **New** — copy of application-service `SubscriptionHelper` (resolve employer, active subscription with super_employer fallback, checkLimit, atomic incrementUsage). Third copy in the codebase — extraction to a shared package is a follow-up task. |
| `src/subscription/subscription.module.ts` | **New** — provides/exports the helper. |
| `src/candidate-search/candidate-profile.service.ts` | **New** — `getCandidateProfile(userId, role, profileId, applicationId?)` and `downloadResume(userId, role, profileId)`. |
| `src/candidate-search/candidate-profile.controller.ts` | **New** — `@Controller('candidates')`, the two routes above, employer-role guarded, Swagger-annotated. No route conflict: `candidates/search` and `candidates/saved` are static segments, matched before `:profileId`. |
| `src/candidate-search/dto/get-candidate-profile.dto.ts` | **New** — optional `applicationId` (UUID) query param. |
| `src/candidate-search/dto/index.ts` | Export new DTO. |
| `src/candidate-search/candidate-search.module.ts` | Register new controller/service, import SubscriptionModule. |
| `test/e2e/` | E2E spec for both endpoints (happy path, private-profile 404, applicationId authz, resume charge path). |

### application-service

| File | Change |
|------|--------|
| `src/application/application.service.ts` | Add `visibility: candidateProfile.visibility` to the `profile` object in `getCandidateProfileForApplication` response (shape parity with new endpoint). No other behavior change. |

### api-gateway

No change — `@All('candidates/*')` wildcard already routes to user-service.

## Side effects considered

1. **Schedule page** (`jobs/[id]/schedule`) keeps using the old applicationId endpoint — untouched, no regression.
2. **Multiple applications**: explicit `applicationId` pins the context; search context uses latest-to-company. Interview actions on the frontend should only render when `application` is non-null and ideally when context is explicit.
3. **Private profiles**: never reachable by ID probing unless the candidate applied to the employer's company. Search already excludes them.
4. **Auto-mark-viewed**: frontend currently flips `applied → viewed` on profile open. From search context `application` may reference a job the employer wasn't looking at — frontend should only auto-mark when navigating with an explicit application context. (Frontend concern, documented here for the team.)
5. **profileViews double-charge**: insert is keyed per (employer user, profile); both endpoints check before charging, so a candidate is paid for at most once per employer user.

## Frontend integration notes (for the team, not in this task)

- Search card `View Profile` → navigate to profile page with `profileId`; call `GET /candidates/:profileId/profile`.
- Applications list / schedule → unchanged (old endpoint), or migrate later to `GET /candidates/:profileId/profile?applicationId=...`.
- `ApplicantDetails.tsx` has unguarded `application.status` accesses (lines ~62, 226) — must null-guard before reusing the component for search-context views.
- `Download Resume` button → `GET /candidates/:profileId/resume`; handle `403` (no subscription / limit reached) with an upgrade prompt. `resume.isDownloaded` in the profile response tells whether the next download is free.

## Follow-ups (out of scope)

- Extract `SubscriptionHelper` into a shared package (now duplicated in job-service, application-service, user-service).
- Align old application endpoint to charge-on-download instead of charge-on-view.
- Saved-candidates list and recommendation-service can reuse `GET /candidates/:profileId/profile`.
