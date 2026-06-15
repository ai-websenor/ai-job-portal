# Dashboard Alerts Carousel — Frontend Spec

Render-ready spec for the **alerts carousel** in `job-board-web`. Backend is done; this doc is
the UI contract + build plan. Matches existing conventions: **HeroUI**, **framer-motion**,
**axios `http`**, **zustand**, Tailwind with `--primary-color: #8070EF`.

---

## 1. What it is

A small auto-sliding carousel of **current-state alert cards** shown on two pages. Alerts are
computed live by the backend per request (not stored, no read/dismiss state yet).

| Alert type | Audience | Trigger | Severity |
|------------|----------|---------|----------|
| `interview_today` | candidate **and** employer | Interview scheduled today (user timezone), status scheduled/confirmed/rescheduled | `info` |
| `low_credits` | employer only | A subscription credit (job posting / resume access / featured job) has **≤ 2** remaining | `warning`, or `critical` when **0** left |
| `job_expiring` | employer only | Active job deadline **within 2 days** | `warning` |

Carousel must support **single-slide** and **multi-slide** layouts (prop-driven) with **auto-slide**.

---

## 2. API contract

**Endpoint:** `GET /api/v1/alerts`
**Auth:** Bearer token (already injected by `http` interceptor — see `src/app/api/http.ts:66`).
**Method to call:** use the shared axios instance `http` (response interceptor already unwraps
`response.data`, so the awaited value IS the body below).

### Response body

```jsonc
{
  "alerts": [
    {
      "id": "low_credits-job_post",
      "type": "low_credits",
      "severity": "critical",
      "title": "No job posting credits left",
      "message": "Upgrade your plan to keep going without interruptions.",
      "actionUrl": "/employer/subscription",
      "actionLabel": "Upgrade plan",
      "meta": { "credit": "job_post", "remaining": 0, "limit": 5, "used": 5 }
    },
    {
      "id": "interview_today-550e8400-e29b-41d4-a716-446655440099",
      "type": "interview_today",
      "severity": "info",
      "title": "Interview today at 3:00 PM",
      "message": "Aman Verma for Senior React Developer",
      "actionUrl": "/interviews/550e8400-e29b-41d4-a716-446655440099",
      "actionLabel": "View interview",
      "meta": {
        "interviewId": "550e8400-...",
        "applicationId": "...",
        "scheduledAt": "2026-06-15T09:30:00.000Z",
        "interviewMode": "online",
        "status": "scheduled"
      }
    }
  ],
  "count": 2
}
```

- Already sorted server-side: `critical` → `warning` → `info`.
- `id` is **stable** per underlying entity → safe as React `key` and for dedupe across polls.
- `actionUrl` is a **relative path** → feed straight into `router.push(...)`.
- Empty list (`count: 0`) is normal → **render nothing** (see §7).

> ⚠️ `actionUrl` paths are backend guesses. Confirm they map to real `routePaths` and remap on
> the client if needed (see §5 mapping table).

### TypeScript types

Add to `src/app/types/` (e.g. `alerts.ts`):

```ts
export type AlertType = 'interview_today' | 'low_credits' | 'job_expiring';
export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  actionUrl: string;
  actionLabel: string;
  meta?: Record<string, unknown>;
}

export interface AlertListResponse {
  alerts: Alert[];
  count: number;
}
```

---

## 3. Theme tokens (white + #8070EF)

Use existing Tailwind tokens — **do not hardcode hex** in components. From `src/app/globals.css:6`:
`--primary-color: #8070EF`, exposed as `text-primary` / `bg-primary` / `bg-secondary` (light tint).

Card surface stays **white** (`bg-white`) to match `CandidateSearchRightRail` and
`JobSearchRightSection`. Severity only colors the **accent strip / icon / chip**, never the whole
card — keeps the rail visually consistent.

| Severity | Accent (icon bg / left strip) | Icon color | Chip |
|----------|-------------------------------|------------|------|
| `info` | `bg-secondary` | `text-primary` | brand `#8070EF` |
| `warning` | `bg-amber-50` | `text-amber-600` | amber |
| `critical` | `bg-red-50` | `text-red-600` | red |

Shared card shell (copy the existing idiom exactly):

```
rounded-2xl border border-gray-100 bg-white p-6 shadow-sm
transition-all hover:-translate-y-0.5 hover:shadow-md
```

Icon tile: `flex h-14 w-14 items-center justify-center rounded-2xl text-2xl`.
Title: `text-lg font-bold text-gray-950`. Message: `mt-2 text-sm leading-6 text-gray-500`.
CTA: HeroUI `<Button color="primary" radius="lg" className="mt-5 w-full font-bold">`.

Suggested icons (`react-icons/fi`, already used): `interview_today` → `FiCalendar`,
`low_credits` → `FiZap` / `FiTrendingUp`, `job_expiring` → `FiClock`.

---

## 4. File plan

```
src/app/
  types/alerts.ts                                  # types above
  hooks/useAlerts.ts                               # fetch + poll
  components/alerts/
    AlertCard.tsx                                  # one card, severity-styled
    AlertsCarousel.tsx                             # slider shell (single / multi)
    AlertsCarousel.skeleton.tsx                    # loading placeholder (optional)
```

No new dependency needed — build the slider with **framer-motion** (already installed). Do **not**
add embla/swiper.

---

## 5. Data hook (`useAlerts.ts`)

Plain hook over `http`; no store needed unless you want cross-page sharing (then mirror
`useNotificationStore.ts`). Poll on an interval so the rail stays fresh without a refresh.

```ts
'use client';
import { useEffect, useState, useCallback } from 'react';
import http from '@/app/api/http';
import type { Alert, AlertListResponse } from '@/app/types/alerts';

const POLL_MS = 5 * 60 * 1000; // 5 min — alerts are slow-moving

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = (await http.get('/api/v1/alerts')) as unknown as AlertListResponse;
      setAlerts(res?.alerts ?? []);
    } catch {
      setAlerts([]); // http interceptor already toasts errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  return { alerts, loading, reload: load };
}
```

### actionUrl → route mapping

Before `router.push`, normalize through a map so backend guesses can't break navigation:

```ts
import routePaths from '@/app/config/routePaths';

function resolveHref(alert: Alert): string {
  switch (alert.type) {
    case 'interview_today':
      return alert.actionUrl;                 // /interviews/:id — confirm route exists
    case 'low_credits':
      return routePaths.employee.subscription /* or pricing/plans page */;
    case 'job_expiring':
      return alert.actionUrl;                 // /employer/jobs/:id — confirm
    default:
      return alert.actionUrl;
  }
}
```

---

## 6. Carousel (`AlertsCarousel.tsx`)

Requirements: **single OR multi slide**, **auto-slide**, **pause on hover**, dots, optional arrows,
keyboard accessible, respects `prefers-reduced-motion`.

### Props

```ts
interface AlertsCarouselProps {
  alerts: Alert[];
  slidesPerView?: number;   // 1 = single (job-board rail), >1 = multi (employer wide layout)
  autoPlay?: boolean;       // default true
  intervalMs?: number;      // default 5000
  loop?: boolean;           // default true
}
```

### Behavior

- `slidesPerView=1`: classic single-card slider (use this for the narrow `max-w-[300px]` rails).
- `slidesPerView>1`: show N cards per page, advance by page. Use for any future wide/grid layout.
- Auto-advance every `intervalMs`; **clear timer on hover/focus**, resume on leave/blur.
- **≤ slidesPerView alerts** → render statically, no auto-play, hide dots/arrows.
- Track index with `useState`; animate the track with framer-motion `animate={{ x }}` +
  `transition`. If `prefers-reduced-motion`, disable both motion and autoplay.
- Dots: one per page; active dot uses `bg-primary`, inactive `bg-gray-300`. Provide
  `aria-label="Go to alert N"`. Wrap the viewport in
  `role="region" aria-roledescription="carousel" aria-label="Alerts"`.

### Sketch

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import AlertCard from './AlertCard';
import type { Alert } from '@/app/types/alerts';

export default function AlertsCarousel({
  alerts, slidesPerView = 1, autoPlay = true, intervalMs = 5000, loop = true,
}: AlertsCarouselProps) {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(alerts.length / slidesPerView);
  const paused = useRef(false);

  useEffect(() => {
    if (!autoPlay || pages <= 1) return;
    const id = setInterval(() => {
      if (paused.current) return;
      setPage((p) => (p + 1 >= pages ? (loop ? 0 : p) : p + 1));
    }, intervalMs);
    return () => clearInterval(id);
  }, [autoPlay, pages, intervalMs, loop]);

  if (alerts.length === 0) return null;

  return (
    <section
      role="region" aria-roledescription="carousel" aria-label="Alerts"
      className="overflow-hidden"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocusCapture={() => (paused.current = true)}
      onBlurCapture={() => (paused.current = false)}
    >
      <motion.div
        className="flex"
        animate={{ x: `-${page * 100}%` }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        {alerts.map((a) => (
          <div key={a.id} className="shrink-0 px-1"
               style={{ width: `${100 / slidesPerView}%` }}>
            <AlertCard alert={a} />
          </div>
        ))}
      </motion.div>

      {pages > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {Array.from({ length: pages }).map((_, i) => (
            <button key={i} aria-label={`Go to alert ${i + 1}`}
              onClick={() => setPage(i)}
              className={`h-2 rounded-full transition-all ${
                i === page ? 'w-5 bg-primary' : 'w-2 bg-gray-300'}`} />
          ))}
        </div>
      )}
    </section>
  );
}
```

`AlertCard.tsx` renders the white shell from §3, picks icon + accent by `alert.severity`/`type`,
and the CTA calls `router.push(resolveHref(alert))`.

---

## 7. Placement

### A) Candidate-search page (employer) — `/employee/candidates/search`

Show carousel **above the "Manage Company Profile" card** in the right rail.
File: `src/app/components/candidate-search/CandidateSearchRightRail.tsx:38` (top of the `<aside>`).

```tsx
const { alerts } = useAlerts();

return (
  <aside className="grid gap-5">
    {alerts.length > 0 && (
      <AlertsCarousel alerts={alerts} slidesPerView={1} intervalMs={6000} />
    )}
    {cards.map((card) => { /* existing Manage Company Profile etc. */ })}
  </aside>
);
```

Rail is narrow → keep `slidesPerView={1}`. Employer sees all three alert types here.

### B) Jobs page (candidate) — `/jobs/search`

Show carousel **above the "Get job alerts" card** in the right section.
File: `src/app/components/job-search/JobSearchRightSection.tsx:16` (first child of the sticky grid).

```tsx
const { alerts } = useAlerts();

return (
  <div className="max-w-full sm:max-w-[300px] h-fit grid gap-6 sticky top-24">
    {alerts.length > 0 && (
      <AlertsCarousel alerts={alerts} slidesPerView={1} intervalMs={6000} />
    )}
    {/* existing "Get job alerts" card ... */}
  </div>
);
```

Candidate only gets `interview_today` here (backend enforces it) — usually 0–1 cards, so the
carousel renders a single static card with no dots. That's expected.

---

## 8. States & edge cases

- **Loading:** render `AlertsCarousel.skeleton` (one shimmer card) or nothing. Don't block the rail.
- **Empty (`count: 0`):** render nothing — no empty card, no placeholder.
- **Single alert:** static card, autoplay + dots off (carousel handles via `pages <= 1`).
- **Errors:** `http` interceptor already toasts; hook swallows and shows nothing.
- **Polling:** 5 min interval + refetch on window focus. No websocket needed for v1.
- **Dedupe:** key by `alert.id`; stable across polls so no flicker on refetch.
- **No dismiss/read state** in v1 (backend doesn't store it). If product wants dismissable cards,
  that needs a backend alerts table — flag it, don't fake it client-side beyond a session-local hide.

---

## 9. Accessibility

- Region landmark + `aria-roledescription="carousel"`.
- Dots are real `<button>`s with `aria-label`.
- Pause on hover **and** keyboard focus (`onFocusCapture`/`onBlurCapture`).
- Honor `prefers-reduced-motion`: disable autoplay + swap spring for instant.
- CTA is a real HeroUI `<Button>` (focusable, Enter/Space activatable).

---

## 10. Definition of done

- [ ] `types/alerts.ts`, `hooks/useAlerts.ts`, `components/alerts/*` added.
- [ ] Carousel works single + multi slide, autoplay, pause-on-hover, dots.
- [ ] Mounted above "Manage Company Profile" (`/employee/candidates/search`).
- [ ] Mounted above "Get job alerts" (`/jobs/search`).
- [ ] Severity styling (info/warning/critical) on white cards, brand `#8070EF` accents.
- [ ] Empty/loading/single-alert states correct.
- [ ] `actionUrl` routes verified against `routePaths` (interview / subscription / job pages).
- [ ] Reduced-motion + a11y checks pass.
```
