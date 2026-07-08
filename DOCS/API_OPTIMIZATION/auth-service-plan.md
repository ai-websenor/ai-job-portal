# API Response Optimization Plan — auth-service

**Branch:** `krish/feat_api_optimization`
**Date:** 2026-07-08
**Goal:** Trim auth-service API responses to only the keys actually consumed by the three frontends, without breaking any of them.

**Frontends audited:**

| Alias | Path | Notes |
|---|---|---|
| **Web** | `apps/job-board-web` | Next.js candidate + employer portal |
| **App** | `apps/react-native-app` | Mobile app (reference copy, not pushed) |
| **Admin** | `apps/admin-panel-web` | Admin panel |

**Method:** Read every controller/service return shape in `apps/auth-service/src`, then grepped all three frontends for consumption of each response key (API layers, Zustand/Redux stores, screens/components).

**Legend:** ✅ used · ❌ not used · 🔧 dev-only field · ⚠️ needs decision

---

## 1. Endpoint usage overview

| Endpoint | Web | App | Admin |
|---|---|---|---|
| `POST /auth/register` | ✅ | ✅ | — |
| `POST /auth/login` | ✅ | ✅ | — |
| `POST /auth/refresh` | ✅ | ✅ | — |
| `POST /auth/logout` | ❌ (clears storage locally) | ✅ | — |
| `POST /auth/verify-email` | ✅ | ✅ | — |
| `POST /auth/forgot-password` | ✅ | ✅ | ✅ |
| `POST /auth/forgot-password/verify` | ✅ | ✅ | ✅ |
| `POST /auth/reset-password` | ✅ | ✅ | ✅ |
| `POST /auth/resend-verification` | ❌ | ✅ | — |
| `POST /auth/resend-verify-email-otp` | ✅ | ❌ | — |
| `POST /auth/send-mobile-otp` | ✅ | ✅ | — |
| `POST /auth/verify-mobile` | ✅ | ✅ | — |
| `POST /auth/resend-mobile-otp` | ✅ | ✅ | — |
| `POST /auth/change-password` | ✅ | ✅ | — |
| `POST /auth/admin/login` | — | — | ✅ |
| `GET /oauth/google` | ✅ | ❌ | — |
| `POST /oauth/google/callback` | ✅ | ❌ | — |
| `POST /oauth/google/native` | ❌ | ✅ | — |
| `POST /company/register/*` (6 endpoints) | ✅ | ❌ | — |
| **`POST /2fa/setup` / `enable` / `disable`, `GET /2fa/status`** | ❌ | ❌ | ❌ |
| **`GET/DELETE /users/me/sessions[/:id]`** | ❌ | ❌ | ❌ |
| **`GET/DELETE /users/me/social-logins[/:provider]`** | ❌ | ❌ | ❌ |

### 🔴 Fully unused modules (zero frontend calls)

- **`two-factor` module** — no frontend calls any `/2fa/*` endpoint. (Admin panel has a TOTP flow, but it targets the admin-service secret-manager, not auth-service 2FA.)
- **`session` controller** — session list/terminate and social-login list/disconnect endpoints are called by no frontend.

⚠️ **Decision needed:** keep these modules (future settings-page features) or remove routes. Recommendation: keep code, exclude from optimization work — no payload to trim since nobody consumes them. Do **not** delete in this pass (out of scope for "response optimization", and removal is a separate product decision).

---

## 2. Shared object: `user` (UserResponseDto)

Returned inside login / refresh / verify-email / verify-mobile / OAuth responses.

| Field | Web | App | Admin | Verdict |
|---|---|---|---|---|
| `userId` | ✅ | ✅ (`OtpVerification`, `Login.tsx`) | ✅ | **Keep** |
| `role` | ✅ (routing) | ✅ | ✅ (roleHelpers) | **Keep** |
| `firstName` | ✅ | ✅ | ✅ | **Keep** |
| `middleName` | ✅ (profile/onboarding forms read store user) | ✅ | ❌ (admin User type omits it) | **Keep** |
| `lastName` | ✅ | ✅ | ✅ | **Keep** |
| `email` | ✅ (redirect params) | ✅ | ✅ | **Keep** |
| `mobile` | ✅ (send-mobile-otp redirect) | ✅ | ✅ (optional in type) | **Keep** |
| `company` (object) | ✅ (employer UI) | ❌ (User type has no company) | ❌ (reads flat `companyId`/`companyName` — see §6) | **Keep** (web) |
| `company.name` | ✅ `EmployeeProfileCard`, `EmployeeProfileLeftSection`, job preview | — | — | **Keep** |
| `company.logoUrl` | ✅ same components | — | — | **Keep** |
| `company.id` | ❌ | ❌ | ❌ | **Remove** ⚠️ (low risk; but cheap to keep — decide) |
| `company.slug` | ❌ | ❌ | ❌ | **Remove** |
| `profilePhoto` | ✅ ProfileCard, avatars | ✅ (User type + Profile screens) | ❌ | **Keep** |
| `isVerified` | ✅ (login redirect) | ✅ | ✅ (in type) | **Keep** |
| `isMobileVerified` | ✅ (login redirect) | ✅ | ✅ (in type) | **Keep** |
| `onboardingStep` | ✅ | ✅ | ❌ | **Keep** |
| `isOnboardingCompleted` | ✅ | ✅ | ❌ | **Keep** |

**Net change to `user`:** drop `company.id` + `company.slug` only (or keep `id` — see decision). Everything else is consumed.

---

## 3. Endpoint-by-endpoint response fields

### 3.1 `POST /auth/register` → `RegisterResponseDto`

| Field | Web | App | Verdict |
|---|---|---|---|
| `userId` | ❌ | ✅ (passed to OtpVerification nav) | **Keep** |
| `message` | ✅ (implicit success toast) | ✅ (toast) | **Keep** |
| `verificationCode` 🔧 | ❌ | ❌ | **Remove from response** — dev convenience, never read; OTP still stored in Redis so dev `123456` flow keeps working |

### 3.2 `POST /auth/login` → `{ message, data: AuthResponseDto }`

| Field | Web | App | Verdict |
|---|---|---|---|
| `message` | ✅ | ✅ | **Keep** |
| `data.accessToken` | ✅ | ✅ | **Keep** |
| `data.refreshToken` | ✅ | ✅ | **Keep** |
| `data.expiresIn` | ❌ | ❌ | **Remove** ⚠️ — unused by all 3 frontends (web/app never read it; admin login is a different endpoint). Standard JWT metadata though; low payload win. See decisions. |
| `data.user` | ✅ (stored whole) | ✅ (stored whole) | **Keep** (minus §2 trims) |
| `data.permissions` | ❌ (web reads `user.permissions` populated from employer **profile** API, not login) | ❌ | **Remove** ⚠️ — verify no employer-web flow depends on it before removing; saves 2 DB queries (`getEmployerPermissions`) per login |
| `data.emailOtp` 🔧 | ❌ | ❌ | **Remove** — non-prod only, never read |
| `data.mobileOtp` 🔧 | ❌ | ❌ | **Remove** — non-prod only, never read |

### 3.3 `POST /auth/refresh` → `AuthResponseDto` (top-level, no wrapper)

| Field | Web | App | Verdict |
|---|---|---|---|
| `accessToken` | ✅ | ✅ | **Keep** |
| `refreshToken` | ✅ | ✅ | **Keep** |
| `expiresIn` | ❌ | ❌ | **Remove** ⚠️ |
| `user` | ❌ (web refresh only stores tokens) | ❌ (RN `refreshAccessToken` only reads tokens) | **Remove** ⚠️ — big win: refresh currently does 2–3 extra DB queries (`getCompanyInfoForUser`, `getProfilePhotoForUser`) purely to build an unused `user` object. Removing also speeds up every token refresh. |

### 3.4 `POST /auth/verify-email` → `VerifyEmailResponseDto`

Web (`VerifyEmailForm` / auto-login) and App (`OtpVerification` — `setUserData(user)`, tokens) consume `message`, `accessToken`, `refreshToken`, `user`. `expiresIn` unused.

| Field | Verdict |
|---|---|
| `message`, `accessToken`, `refreshToken`, `user` | **Keep** |
| `expiresIn` | **Remove** ⚠️ |

### 3.5 `POST /auth/verify-mobile` → same DTO

Web `VerifyMobileOtpForm` uses `result.user` + tokens; App `OtpVerification`/`MobileVerification` same. Same verdicts as 3.4.

### 3.6 `POST /auth/forgot-password` → `{ message, otp? }`

| Field | Web | App | Admin | Verdict |
|---|---|---|---|---|
| `message` | ✅ | ✅ | ✅ | **Keep** |
| `otp` 🔧 | ❌ | ❌ | ❌ | **Remove** — has an explicit `// TODO: Remove otp from response before production launch` in code (`auth.service.ts:693`). Dev `123456` bypass in verify step still works without it. |

### 3.7 `POST /auth/forgot-password/verify` → `VerifyForgotPasswordResponseDto`

`message` + `resetPasswordToken` both used by all three (web redirect param, App `ResetPassword` route param, Admin `ForgotPasswordDialog`). **Keep both. No change.**

### 3.8 `POST /auth/reset-password`, `logout`, `change-password`, `resend-*` → `MessageResponseDto`

`{ message }` only. **No change.**

### 3.9 `POST /auth/admin/login` → `{ message, data: SuperAdminLoginResponseDto }`

Admin `authStore.login` destructures `{ accessToken, user, permissions }`.

| Field | Admin | Verdict |
|---|---|---|
| `message` | ✅ | **Keep** |
| `data.accessToken` | ✅ | **Keep** |
| `data.expiresIn` (`'never'`/`'365d'` string) | ❌ (typed optional, never read) | **Remove** ⚠️ |
| `data.user` | ✅ (stored whole) | **Keep** — but see §6 mismatch: admin expects flat `companyId`/`companyName`, backend sends `company: {id, name, logoUrl, slug}` |
| `data.user.company.logoUrl` / `.slug` | ❌ (always `null`/`''` hardcoded anyway) | **Remove** from this endpoint's user.company |
| `data.permissions` | ✅ (RBAC gates) | **Keep** |

### 3.10 OAuth — `GET /oauth/google`, `POST /oauth/google/callback` (Web), `POST /oauth/google/native` (App)

- `GET /oauth/google` → `{ url }` — used (web redirect). **No change.**
- Callback/native → `{ message, data: { accessToken, refreshToken, expiresIn, user } }`
  - Web `google/callback/page.tsx`: tokens + `setUser(user)` ✅
  - App `Login.tsx` googleSignIn: `{ accessToken, refreshToken, user }` ✅
  - `expiresIn` ❌ → **Remove** ⚠️

### 3.11 Company registration — `POST /company/register/*` (Web employer signup only)

| Endpoint | Fields used by Web | Unused → Remove |
|---|---|---|
| `send-mobile-otp` | `sessionToken` (nav param), `message` | `otp` 🔧 dev-only |
| `verify-mobile-otp` | `sessionToken`, `message` | — |
| `send-email-otp` | `sessionToken`, `message` | `otp` 🔧 dev-only |
| `verify-email-otp` | `sessionToken`, `message` | — |
| `basic-details` | `sessionToken` (implicit), `message` | — |
| `gst-document/upload-url` | `uploadUrl`, `key` | `expiresIn` ⚠️ (verify web PUT flow doesn't read it — grep says no) |
| `complete` | `accessToken`, `refreshToken`, `user` (whole), `company` (whole, stored as `user.company`), `message` | `expiresIn`; `company.verificationStatus`, `company.gstValidationStatus` not read ⚠️ |

### 3.12 `two-factor`, `session` controllers

No consumers → **no response optimization applicable.** Leave untouched (see §1 decision).

---

## 4. Implementation order (non-breaking)

Each step independently deployable; frontends only ever receive a superset→equal set of what they read.

1. **Remove dev-only leakage fields** (safe, also a security win):
   - `register.verificationCode`, `login.emailOtp`, `login.mobileOtp`, `forgot-password.otp`, company-reg `otp` fields.
2. **Remove `expiresIn`** from: login, refresh, verify-email, verify-mobile, oauth callback/native, admin login, company-reg complete, gst upload-url.
   - ⚠️ Pre-check: confirm no frontend interceptor schedules token refresh off `expiresIn` (web `http.ts` refreshes on 401 — confirmed; RN same; admin never reads it).
3. **Slim `/auth/refresh`** to `{ accessToken, refreshToken }` and drop the `getCompanyInfoForUser` / `getProfilePhotoForUser` DB calls there. Biggest perf win.
4. **Trim `user.company`** to `{ name, logoUrl }` (or keep `id` — see §5) in all auth responses.
5. **Remove `permissions` from `/auth/login`** (keep in `/auth/admin/login`) + delete the `getEmployerPermissions` calls in `login`/`buildAuthResponse`. ⚠️ Do last; retest employer web login → members/permissions pages, which repopulate `user.permissions` from `GET /employers/profile`.
6. **Update DTOs + Swagger** (`AuthResponseDto`, `VerifyEmailResponseDto`, `SuperAdminLoginResponseDto`, `RegisterResponseDto`, company-reg DTOs) to match trimmed shapes.
7. **Update E2E tests** in `apps/auth-service/test/e2e/` expecting removed fields.

### Verification checklist (run after each step)

- Web: candidate login → dashboard; employer login → candidate search; signup → email OTP → mobile OTP → onboarding; forgot/reset password; Google login; employer company registration end-to-end.
- App: login, signup+OTP, Google native login, refresh flow (token expiry), forgot/reset.
- Admin: admin login, RBAC-gated pages, forgot/reset password.
- `pnpm test:e2e:auth` (or targeted spec) green.

---

## 5. Decisions — RESOLVED (2026-07-08)

Owner ruled: **anything marked ⚠️ (needs decision) is NOT removed**, unused endpoints are NOT removed, and **no frontend code is edited** — backend changes only.

1. **`expiresIn`** — ⚠️ → **KEPT** everywhere.
2. **`company.id`** — ⚠️ → **KEPT**. Only `company.slug` removed (plain ❌, no consumer).
3. **`permissions` in `/auth/login`** — ⚠️ → **KEPT**.
4. **2FA + session/social-login endpoints** — **KEPT**, untouched.
5. **`/auth/refresh` `user` object** — ⚠️ → **KEPT**.
6. **§6 mismatches** — informational only, no fixes in this pass (would risk behavior changes / need frontend coordination).

### Implemented (backend only)

| Change | File |
|---|---|
| `register` response: dropped `verificationCode` (dev leak; Redis dev-OTP flow unaffected) | `auth.service.ts`, `dto/index.ts` |
| `login` response: dropped `emailOtp` / `mobileOtp` dev fields | `auth.service.ts` |
| `forgot-password` response: dropped `otp` (closes in-code TODO) | `auth.service.ts`, `dto/index.ts` (`ForgotPasswordResponseDto`) |
| `user.company.slug` dropped from login / refresh / verify-email / verify-mobile / OAuth / admin-login responses (also removes `slug` from the company DB select) | `auth.service.ts`, `oauth.service.ts`, `dto/index.ts` (`CompanyInfoDto`) |
| Stale `otp?` fields removed from company-reg send-OTP response DTOs (service never returned them) | `company-registration/dto/index.ts` |
| Company-registration `complete` response — untouched (web stores whole `company` object) | — |

`tsc --noEmit` clean. No E2E specs referenced removed fields.

---

## 6. Pre-existing mismatches found during audit (not caused by this work)

1. **Admin `companyId`/`companyName`**: `admin-panel-web` `authStore.User` + `roleHelpers`/`AdminSidebar` read flat `user.companyId` / `user.companyName`, but `/auth/admin/login` returns `user.company: { id, name, logoUrl, slug }`. Admin-with-company UI gating likely never triggers. Fix direction TBD (either flatten backend response or read `user.company?.id` in admin).
2. **Company-registration `complete` company shape**: web stores `result.company` (`{ companyId, companyName, slug, ... }`) as `user.company`, but employer components read `user.company.name` / `.logoUrl` (the login shape `{ id, name, logoUrl, slug }`). Freshly registered employers show no company name until re-login. Align `complete` response's `company` keys with `CompanyInfoDto`.
3. **`/auth/admin/logout`**: admin endpoints file references it; auth-service has no such route.
4. RN `OtpVerification` falls back to `res.data?.token || res.data` for `resetPasswordToken` — remove fallbacks once shape is contractual.

---

## 7. Files to touch (implementation phase)

| File | Change |
|---|---|
| `apps/auth-service/src/auth/auth.service.ts` | steps 1–5 (login, refresh, verifyEmail, verifyMobile, forgotPassword, register, superAdminLogin, buildAuthResponse) |
| `apps/auth-service/src/auth/dto/index.ts` | DTO trims (step 6) |
| `apps/auth-service/src/oauth/oauth.service.ts` | drop `expiresIn` from callback/native responses |
| `apps/auth-service/src/company-registration/company-registration.service.ts` | dev `otp` fields, `expiresIn`, align `company` keys (§6.2) |
| `apps/auth-service/src/company-registration/dto/index.ts` | DTO trims |
| `apps/auth-service/test/e2e/*` | expectation updates |

No gateway changes needed (proxy is pass-through).
