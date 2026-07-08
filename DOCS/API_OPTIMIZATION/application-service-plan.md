# API Response Optimization Plan — application-service

**Branch:** `krish/feat_api_optimization`
**Date:** 2026-07-08
**Frontends audited:** Web (`apps/job-board-web`), App (`apps/react-native-app`, local reference), Admin (uses admin-service, not application-service)

**Standing rules:** ⚠️/ambiguous kept · unused endpoints kept · backend response-shape only, zero logic changes.

---

## 1. Module audit summary

| Module | Verdict |
|---|---|
| `interview` (list/upcoming/details/rounds) | **No change.** Every response goes through `enrichInterviewRow()` / hand-built objects (candidateName, companyName, signed URLs). The heavy `with: { employer: { company: true }, jobSeeker: { profile: true } }` fetches are enrichment inputs, never serialized. |
| `alert` | **No change.** Alerts are hand-built `{id, type, title, message, meta}` objects. |
| `application` | **TRIMMED — see §2.** Three endpoints serialized raw relation rows. |
| `offer` | **TRIMMED — see §2.** `getById` serialized raw `jobSeeker` + `job.employer`. |

Internal fetches using `employer: true` / `job: true` for ownership/notification checks (apply, quick-apply, updateStatus, withdraw, history, candidate-profile, resume download) are never serialized — untouched.

---

## 2. Implemented changes

Two shared column picks added (`employerPublicColumns` — same 11-field set as job-service; `jobSeekerPublicColumns` — `{id, firstName, middleName, lastName, email, mobile}`, matching the web `IApplication.jobSeeker` type contract exactly plus middleName).

| Endpoint | Was | Now |
|---|---|---|
| `GET /applications/my-applications` (candidate list) | `job.employer` = full employers row (subscription plan/expiry, rbacRoleId, ack flags → candidates) | `employerPublicColumns` |
| `GET /applications/job/:jobId` (employer's applicant list) | 🔒 `jobSeeker` = **full `users` row per applicant — including `password` hash, `twoFactorSecret`, `cognitoSub`, `resumeDetails` jsonb** | `jobSeekerPublicColumns` |
| `GET /applications/:id` | Both raw: `job.employer` full + 🔒 `jobSeeker` full users row | Both trimmed |
| `GET /applications/:id/offer` (offer.getById) | Both raw (spread into `{...application, offerDetails}`) | Both trimmed |

### Consumer verification

- Web `IApplication.jobSeeker` type: `{id, firstName, lastName, email, mobile, profilePhoto}` — `JobApplicantCard` reads `id, firstName, lastName, email, profilePhoto`. `profilePhoto` never existed on the users row (comes via the separate `candidateProfilePhoto` field the service adds) — unchanged.
- RN `InterviewDetails` reads `application?.jobSeeker` → `firstName`/`lastName` — covered.
- Employer reads on applications (RN AppliedJobList: `employer?.userId/firstName/lastName/profilePhoto`; web contact blocks: email/phone) — all in `employerPublicColumns`.

## 3. Notes

- `apps/application-service/src/application/application.service.ts.tmp.*` — stray tooling temp file in the worktree, left untracked.
- The severity item here (password hash in applicant lists) existed on employer-facing endpoints only (gated by job ownership), but was still serialized to browsers/logs. Now fixed at query level — the columns never leave the DB.

## 4. Verification

- `pnpm exec tsc --noEmit` — clean.
- Retest: candidate my-applications list + application detail, employer applicant list for a job (`JobApplicantCard` renders name/email), offer view/accept/decline, interview details/rounds (unchanged paths).
