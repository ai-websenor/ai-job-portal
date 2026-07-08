# Content Management (CMS) — Frontend Integration Guide (Web)

Audience: **Web frontend developer** (Next.js `job-board-web`).
Scope: CMS static pages (About Us, Terms, Privacy, any slug) + FAQs.
Backend: `admin-service`, exposed through API Gateway. All endpoints live and functional on branch `krish/feat-content_management`.

---

## 1. Overview

Two content types:

| Type | What it is | Managed by | Consumed by |
|------|-----------|-----------|-------------|
| **CMS Page** | One HTML rich-text document identified by a `slug` (e.g. `about-us`, `terms-conditions`, `privacy-policy`). Has SEO meta fields + publish status. | Admin panel (super_admin) | Web + mobile (public) |
| **FAQ** | A single question/answer entry, grouped by `category`, ordered by `sortOrder`, toggleable `isActive`. | Admin panel (super_admin) | Web + mobile (public) |

Content is authored in the **admin dashboard** (`/content-management`). The **web frontend only reads** the public endpoints — it never writes. No auth token needed for the public read endpoints.

---

## 2. Base URL & conventions

- Gateway base: `http://localhost:3000` (dev) — prod uses your configured API base.
- Global prefix: **`/api/v1`**.
- Public endpoints: **no `Authorization` header**.
- Content type: `application/json`. Page `content` is an **HTML string** (authored with a rich-text editor). Render it with `dangerouslySetInnerHTML` (sanitize first — see §6).
- Responses may be wrapped. Handle both `response.data` and the raw object (the admin panel does `data.data || data`). Assume the payload may be under a `data` key.

---

## 3. Public endpoints (web consumes these)

### 3.1 List published pages
```
GET /api/v1/pages
```
Returns lightweight rows (no full `content`) — use for sitemaps / footer links.

Response `200`:
```json
[
  {
    "id": "uuid",
    "slug": "about-us",
    "title": "About Us",
    "metaTitle": "About Us - ...",
    "metaDescription": "...",
    "updatedAt": "2026-07-08T10:00:00.000Z",
    "publishedAt": "2026-07-08T10:00:00.000Z"
  }
]
```

### 3.2 Get one published page by slug
```
GET /api/v1/pages/:slug
```
Example: `GET /api/v1/pages/about-us`

Response `200`:
```json
{
  "id": "uuid",
  "slug": "about-us",
  "title": "About Us",
  "content": "<h1>About</h1><p>...</p>",
  "metaTitle": "About Us - India's #1 Job Portal",
  "metaDescription": "Learn about ...",
  "metaKeywords": "job portal, careers, recruitment",
  "status": "published",
  "publishedAt": "2026-07-08T10:00:00.000Z",
  "createdAt": "...",
  "updatedAt": "..."
}
```
- Returns **only `published`** pages. Draft or unknown slug → `404` `{ "message": "Page not found" }`. Render your own 404/empty state on 404.

### 3.3 List active FAQs
```
GET /api/v1/faqs
GET /api/v1/faqs?category=Job%20Seekers
```
Returns only `isActive` FAQs, ordered by `sortOrder` asc. Optional `category` filter.

Response `200`:
```json
[
  {
    "id": "uuid",
    "question": "How do I apply for a job?",
    "answer": "Open the job listing and click Apply...",
    "category": "Job Seekers",
    "sortOrder": 0
  }
]
```
Group client-side by `category` to render an accordion.

---

## 4. Reserved page slugs (agreed with admin panel)

The admin dashboard currently ships editors for these three slugs. Build web routes for them:

| Slug | Web route (suggested) |
|------|----------------------|
| `about-us` | `/about-us` |
| `terms-conditions` | `/terms-conditions` (or `/terms`) |
| `privacy-policy` | `/privacy-policy` (or `/privacy`) |

FAQs render on a single `/faqs` (or `/help`) page, grouped by category.

More pages can be added later purely by creating a new slug in admin — the web side just needs a route pointing at that slug. Use §3.1 to discover slugs dynamically if you want it fully data-driven.

---

## 5. Admin endpoints (reference only — NOT for web frontend)

For completeness / admin-panel devs. All require `Authorization: Bearer <admin JWT>`, super_admin role.

**Pages**
```
GET    /api/v1/content/pages                 # list all (draft + published)
GET    /api/v1/content/pages/slug/:slug      # get by slug (any status)
GET    /api/v1/content/pages/:id             # get by id
POST   /api/v1/content/pages                 # create
PUT    /api/v1/content/pages/:id             # update
DELETE /api/v1/content/pages/:id             # delete
```
Create/Update body:
```json
{
  "slug": "about-us",
  "title": "About Us",
  "content": "<p>...</p>",
  "metaTitle": "…",
  "metaDescription": "…",
  "metaKeywords": "…",
  "isPublished": true
}
```
- `isPublished: true` → `status=published` and stamps `publishedAt`. `false` → `draft`, clears `publishedAt`. `slug` is ignored on update (immutable).

**FAQs**
```
GET    /api/v1/content/faqs                  # list all (incl. inactive), ?category= filter
GET    /api/v1/content/faqs/:id
POST   /api/v1/content/faqs
PUT    /api/v1/content/faqs/:id
DELETE /api/v1/content/faqs/:id
```
Create/Update body:
```json
{
  "question": "How do I apply?",
  "answer": "…",
  "category": "Job Seekers",
  "sortOrder": 0,
  "isActive": true
}
```

---

## 6. Web integration notes

- **Rendering HTML**: page `content` is trusted admin HTML but sanitize defensively before injecting (e.g. `isomorphic-dompurify`) then `dangerouslySetInnerHTML`.
- **SEO**: map `metaTitle` / `metaDescription` / `metaKeywords` into Next.js `generateMetadata` (or `<Head>`). Fall back to `title` when `metaTitle` is null.
- **SSR/ISR**: pages change rarely — fetch server-side with revalidation (e.g. `next: { revalidate: 300 }`) for fast, cacheable static pages.
- **404 handling**: slug endpoint returns `404` for missing/draft. Catch it and render `notFound()` rather than surfacing an error toast.
- **FAQs UI**: fetch `/api/v1/faqs`, group by `category`, render an accordion in `sortOrder` order.
- **No auth**: do NOT attach the user token to these public calls; they are anonymous.

Minimal fetch example:
```ts
// app/about-us/page.tsx
async function getPage(slug: string) {
  const res = await fetch(`${API_BASE}/api/v1/pages/${slug}`, {
    next: { revalidate: 300 },
  });
  if (res.status === 404) return null;
  const json = await res.json();
  return json.data ?? json; // tolerate wrapped/unwrapped
}
```

---

## 7. React Native app → redirect to web

The mobile app does **not** implement native CMS/FAQ screens. Content Management pages open the **web** versions (single source of truth, no duplicate native markup rendering).

Approach:
- Open these web URLs in an in-app browser (`WebView` / `expo-web-browser` / `Linking.openURL`):
  - About Us → `https://<web-host>/about-us`
  - Terms & Conditions → `https://<web-host>/terms-conditions`
  - Privacy Policy → `https://<web-host>/privacy-policy`
  - FAQ / Help → `https://<web-host>/faqs`
- Web pages must therefore be **publicly reachable without login** (they are — §3 is anonymous).
- Keep the web routes mobile-responsive; the app just wraps them.
- If the app ever needs raw content instead of a webview, the same public JSON endpoints in §3 work as-is.

---

## 8. Status / gaps closed on this branch

- ✅ FAQ entity: new `faqs` table + full admin CRUD + public list endpoint.
- ✅ `publishedAt` now stamped on publish, cleared on unpublish (was previously never set).
- ✅ `metaKeywords` now accepted on create/update (was in DB but not writable via API).
- ✅ Public "list published pages" endpoint added (`GET /api/v1/pages`).
- DB migration: `packages/database/drizzle/0045_content_faqs.sql` (additive, idempotent). Apply on dev RDS first, then staging.
