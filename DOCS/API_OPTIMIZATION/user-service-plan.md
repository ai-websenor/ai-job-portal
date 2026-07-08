# API Response Optimization Plan — user-service

**Branch:** `krish/feat_api_optimization`
**Date:** 2026-07-08
**Frontends audited:** Web (`apps/job-board-web`), App (`apps/react-native-app`, local reference), Admin (`apps/admin-panel-web`)

**Standing rules (set by owner during auth-service pass):**
1. Fields/endpoints marked ⚠️ (needs decision / any ambiguity) are **NOT removed**.
2. Endpoints unused by frontends are **NOT removed**.
3. **Backend changes only** — response shape adjustments, never logic. All removed values still exist in DB/logic; re-exposing any field is a 1–2 line diff.

**Legend:** ✅ used · ❌ zero consumers (all 3 apps) · ⚠️ ambiguous/decision → keep · 🔒 sensitive/internal

---

## 1. Module-by-module audit summary

| Module | Response shape | Verdict |
|---|---|---|
| `candidate` (`GET /candidates/profile`) | Full `profiles` row + relations (workExperiences, educationRecords, certifications, profileSkills, resumes, jobPreferences) | **No change.** Nearly every field is declared in RN `FullProfile` / web types and consumed across profile/onboarding screens. `resumes[].parsedContent` already stripped server-side. `isPromoted`/`promotionExpiresAt`/`profileBoostCount` have no runtime reads but are declared in web + RN types → ⚠️ keep. Duplicate aliases (`videoUrl`/`videoResumeUrl`, `videoStatus`/`videoProfileStatus`, `rejectionReason`/`videoRejectionReason`) each have separate consumers (web VideoResumeSection reads aliases + raw mix; admin reads raw names) → keep all. |
| `candidate-search` (`GET /candidates/search`, saved list) | Explicit `candidateCardColumns` pick — already lean | **No change.** All card fields (profileId, name, headline, location, photo, experience, salary, noticePeriodDays, availability, skills, isSaved, isUnlocked) consumed by web candidate search + RN CandidateSearchScreen. |
| `candidate-profile` (employer viewing candidate) | Hand-picked fields with contact gating (`email`/`phone` nulled unless unlocked) | **No change.** Already curated. |
| `employer` (`GET /employers/profile`) | `...employers row` + nested full `user` row + full `company` row + `activeSubscription` + `permissions` | **TRIMMED — see §2.** Was the fattest/leakiest response in the service. |
| `company` (`GET /company/profile`) | Company row with sensitive fields masked (`maskSensitive`) | **No change.** Masking already in place; web company settings reads pan/gst/cin (masked), gstDocumentUrl, logo/banner. |
| `company-employer` (members CRUD) | Every response goes through `mapEmployerToResponse()` — explicit 14-field DTO | **No change.** Internal `user: true` fetches (lines 543/667) are never serialized. |
| `resume` | `parsedContent` already stripped from upload/register/list responses | **No change.** |
| `skill`, `education`, `certification`, `language`, `preference`, `project`, `document` | Small row passthroughs; RN/web type declarations mirror the rows | **No change.** Row fields consumed or type-declared (⚠️) — nothing clear-cut. |
| `video-profile` | Status/URL payloads; `videoUploadedAt`/`durationSeconds` read by RN VideosApi, statuses by web + admin | **No change.** |

---

## 2. Implemented: `GET /employers/profile` trims

(Also applies to `createProfile` / `updateProfile` / `linkEmployerToCompany` responses — they all return `getProfile()`.)

### Nested `user` object — excluded columns

| Field | Why removed |
|---|---|
| `twoFactorSecret` 🔒 | TOTP secret leaked to client. Zero runtime reads (type declarations only in web `types.ts` / RN `user.type.ts`). |
| `cognitoSub` 🔒 | Internal AWS Cognito ID. Zero runtime reads. |
| `resumeDetails` | Large `jsonb` (full parsed resume). Zero reads from this response — RN populates its `resumeDetails` from resume-upload API responses (`response.data.resume`), never from employer profile. Biggest payload win. |
| `password` | Already excluded before this change. |

### Employer row — omitted from spread

| Field | Why removed |
|---|---|
| `rbacRoleId` | Internal RBAC pointer; `permissions` array (derived server-side from it) is what clients consume. Zero reads. |
| `profileAccessNoticeAck` | Internal modal-ack flag; clients use `GET /candidates/profile-access/summary` for this flow. Zero reads. |
| `subscriptionPlan`, `subscriptionExpiresAt` | Legacy columns superseded by the `activeSubscription` object (which web reads: `planId`, `featuredJobsLimit`). Zero reads of the legacy fields. |

### Kept (⚠️ or consumed)

- Nested `user` object itself — no direct `.user.*` reads found, but wholesale removal is a shape change → ⚠️ keep.
- Full `company` row inside employer profile — web reads `name`/`logoUrl`; pan/gst/kyc fields are read by web/admin from *other* endpoints (company-profile, admin-service), so source is ambiguous → ⚠️ keep all.
- `activeSubscription` ✅ (web MainHeader, JobForm, PlanCard, MainDrawer), `permissions` ✅ (web permissionUtils), `profilePhoto` ✅, `country`/`state`/`city` ✅ (RN recruiter Profile).

---

## 3. Notes / observations (no action)

- `company-employer.service.ts:543,667` fetch `user: true` (includes password hash) for internal checks — never serialized, but tightening to `columns: { password: false }` would be good hygiene (out of scope: not a response change).
- Employer profile's raw `company` row bypasses the masking that `GET /company/profile` applies (`panNumber`, `gstNumber`, `kycDocuments`, `gstExtractedData` go to the company's own super_employer unmasked). Same-tenant data, but flag for a future security pass. ⚠️
- Candidate `GET /candidates/profile` returns both raw and alias names for video fields (`videoProfileStatus` + `videoStatus`, etc.). Consolidating requires frontend edits → out of scope.

## 4. Verification

- `pnpm exec tsc --noEmit` (user-service) — clean.
- Employer web flows to retest: employer login → profile page (photo, company card), members pages (permissions from profile), subscription gating in header/job form.
- RN recruiter: Profile tab (country/state/city init, photo upload).
