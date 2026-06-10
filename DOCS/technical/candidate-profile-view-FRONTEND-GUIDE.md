# Candidate Profile View — Frontend Integration Guide (Web + React Native)

**Audience**: Frontend developers (Next.js job-board-web, React Native app)
**Backend status**: Implemented, on `dev` branch
**Backend design doc**: `candidate-profile-view-implementation.md`

## What changed

Employers can now open a candidate profile **from candidate search** (where there is no `applicationId`). Two new endpoints, both behind the API Gateway and employer-role guarded:

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/candidates/:profileId/profile` | Full candidate profile by `profileId`. Same response shape as the existing `GET /api/v1/applications/:applicationId/candidate-profile` — reuse the same profile page/components. |
| `GET /api/v1/candidates/:profileId/resume` | Signed download URL for the candidate's default resume. **This call charges the subscription credit** (first time per candidate). |

The old application-based endpoint is unchanged (one new field: `profile.visibility`). Applications list and schedule pages keep working as-is.

---

## 1. View Profile

### From candidate search / saved candidates

Search results give you `profileId` on each card. Navigate to the profile page and call:

```
GET /api/v1/candidates/{profileId}/profile
Authorization: Bearer <employer token>
```

### From an application context (optional migration, not required)

```
GET /api/v1/candidates/{profileId}/profile?applicationId={applicationId}
```

`applicationId` pins which application appears in the `application` object. Without it, the backend auto-fills the candidate's **latest application to your company**, or `null` if they never applied.

### Response

Identical shape to the old application-based endpoint, plus the fields marked NEW:

```jsonc
{
  "profile": {
    "userId": "uuid",
    "firstName": "Asha",
    "lastName": "Verma",
    "email": "asha@example.com",
    "phone": "+91...",
    "headline": "Senior Backend Engineer",
    "professionalSummary": "...",
    "totalExperienceYears": "6.5",
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "profilePhoto": "https://... | null",
    "visibility": "public"                     // NEW — also added to the old endpoint
  },
  "workExperiences": [ /* ... */ ],
  "educationRecords": [ /* ... */ ],
  "certifications": [ /* ... */ ],
  "skills": [ { "skillName": "Node.js", "category": "backend", /* ... */ } ],
  "jobPreferences": { /* ... */ },

  "application": {                              // ⚠ CAN BE NULL (candidate never applied to your company)
    "applicationId": "uuid",
    "candidateId": "uuid",                      // = profileId
    "jobId": "uuid",
    "jobTitle": "Backend Engineer",
    "status": "applied",
    "appliedAt": "2026-06-01T...",
    "resumeUrl": "...",                         // resume submitted WITH that application
    "resumeId": "uuid | null",
    "coverLetter": "... | null",
    "threadId": "uuid | null"
  },

  "resume": {                                   // NEW — candidate's default resume; CAN BE NULL
    "id": "uuid",
    "fileName": "asha-verma-resume.pdf",
    "resumeName": "Primary Resume",
    "fileType": "pdf",
    "fileSize": 184320,
    "updatedAt": "2026-05-20T...",
    "isDownloaded": false                       // true = you already paid for this candidate, next download is free
  },

  "videoResume": {                              // null unless candidate's video is approved
    "url": "https://...signed, 1h expiry",
    "status": "approved"
  }
}
```

> Wrapped by the standard response interceptor exactly like the old endpoint — access it the same way you do today (`res.data...`).

### Errors

| Status | When | UI handling |
|--------|------|-------------|
| `400` | Invalid `profileId`/`applicationId` UUID, or `applicationId` belongs to a different candidate | Treat as bad link |
| `401` | No/expired token | Standard re-auth |
| `403` | Not an employer, or no access to that application | "Access denied" |
| `404` | Profile not found — **also returned for private profiles that never applied to your company** | "Candidate not found / profile is private" |

Viewing is **free** — no subscription required, no credit consumed.

---

## 2. Download Resume

Do **not** build a URL from `resume` metadata — the profile response intentionally has no file URL. On button press:

```
GET /api/v1/candidates/{profileId}/resume
Authorization: Bearer <employer token>
```

```jsonc
{
  "message": "Resume download URL generated",
  "data": {
    "id": "uuid",
    "fileName": "asha-verma-resume.pdf",
    "resumeName": "Primary Resume",
    "fileType": "pdf",
    "fileSize": 184320,
    "url": "https://s3...signed"                // expires in 1 HOUR — never cache/persist
  }
}
```

### Billing semantics (important for UX copy)

- First download of a candidate consumes **1 resume_access credit** from the employer's subscription.
- Subsequent downloads of the same candidate are free (per employer user).
- Candidates already viewed via the applications flow count as paid — download free.
- `resume.isDownloaded` in the profile response tells you, before the click, whether the next download is free. Use it for button copy, e.g. "Download Resume (1 credit)" vs "Download Resume".

### Errors

| Status | Body message | UI handling |
|--------|--------------|-------------|
| `403` | `No active subscription found...` | Show subscribe/upgrade prompt |
| `403` | `You have reached your resume access limit (N)...` | Show limit-reached + upgrade prompt |
| `404` | `Resume not found for this candidate` | Disable/hide button (or check `resume === null` from profile response and pre-disable) |
| `404` | `Candidate profile not found` | Same as profile-view 404 |

### Web (Next.js)

```ts
const res = await http.get(ENDPOINTS.EMPLOYER.CANDIDATES.RESUME(profileId));
const { url, fileName } = res.data;
const a = document.createElement('a');
a.href = url;
a.download = fileName;     // S3 may override via Content-Disposition; fine either way
a.click();
```

### React Native

```ts
const res = await api.get(`/candidates/${profileId}/resume`);
const { url, fileName } = res.data.data;

// Option A — open in browser/viewer
await Linking.openURL(url);

// Option B — save to device (expo-file-system / rn-fetch-blob)
await FileSystem.downloadAsync(url, FileSystem.documentDirectory + fileName);
```

Never store the signed URL (1h expiry). Re-fetch on every download tap — repeat fetches for the same candidate are free.

---

## 3. Required UI guards (web — known issues to fix when wiring up)

1. **`application` can be `null`.** `ApplicantDetails.tsx` currently reads `application.status` unguarded (~lines 62–63, 226–228) — will crash when the page is opened from search for a candidate who never applied. Null-guard, and hide all application-driven actions (status chips, schedule interview, reject, message thread) when `application === null`.
2. **Auto-mark-viewed.** The profile page auto-flips status `applied → viewed` on open (`jobs/[id]/applications/[applicantId]/page.tsx:25`). Only do this when navigating with an **explicit application context** (applications list), never from search — the auto-filled latest application may belong to a job the employer wasn't looking at.
3. **Enable the disabled buttons** on `CandidateCard.tsx` (`View Profile` at line ~144, `Download Resume` at line ~153) and route `View Profile` to the profile page with `candidate.profileId`. Suggested route: `/employee/candidates/[profileId]` reusing the existing profile components.
4. **`resume === null`** → disable Download Resume on the profile page and the search card flow.
5. **`videoResume === null`** → already handled the same way as the old endpoint.

## 4. Suggested endpoint additions (`endpoints.ts`)

```ts
EMPLOYER: {
  CANDIDATES: {
    // existing SEARCH / SAVED ...
    PROFILE: (profileId: string, applicationId?: string) =>
      `/candidates/${profileId}/profile${applicationId ? `?applicationId=${applicationId}` : ''}`,
    RESUME: (profileId: string) => `/candidates/${profileId}/resume`,
  },
}
```

## 5. TypeScript types

```ts
interface CandidateProfileResponse {
  profile: {
    userId: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    headline: string | null;
    professionalSummary: string | null;
    totalExperienceYears: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    profilePhoto: string | null;
    visibility: string; // 'public' | 'private' | ...
  };
  workExperiences: unknown[];
  educationRecords: unknown[];
  certifications: unknown[];
  skills: Array<{ skillName?: string; category?: string; [k: string]: unknown }>;
  jobPreferences: Record<string, unknown> | null;
  application: {
    applicationId: string;
    candidateId: string;
    jobId: string;
    jobTitle: string | null;
    status: string;
    appliedAt: string;
    resumeUrl: string | null;
    resumeId: string | null;
    coverLetter: string | null;
    threadId: string | null;
  } | null;
  resume: {
    id: string;
    fileName: string;
    resumeName: string | null;
    fileType: string;
    fileSize: number | null;
    updatedAt: string;
    isDownloaded: boolean;
  } | null;
  videoResume: { url: string; status: string } | null;
}

interface ResumeDownloadResponse {
  message: string;
  data: {
    id: string;
    fileName: string;
    resumeName: string | null;
    fileType: string;
    fileSize: number | null;
    url: string; // signed, expires in 1 hour — never cache
  };
}
```

## 6. Flow summary

```
Candidate Search card                    Applications list (unchanged)
  └─ View Profile (profileId)              └─ View Profile (applicationId)
       │                                        │
       ▼                                        ▼
  GET /candidates/:profileId/profile      GET /applications/:id/candidate-profile
       │   (free, application may be null)     (existing flow, charges on first view)
       ▼
  Profile page (shared components, application null-guarded)
       │
       └─ Download Resume tap
            ▼
       GET /candidates/:profileId/resume
            (charges 1 resume_access credit on FIRST download per candidate;
             403 → show subscribe / limit-reached prompt)
            ▼
       open/save signed URL (1h expiry)
```
