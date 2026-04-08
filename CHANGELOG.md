# Changelog

## 2026-04-09 — Job Recommendations, Permissions & Interview Emails

### Added
- Job recommendation optimization — store in DB, reduce AI API calls, Redis cache per user
- New RBAC permissions: `subscriptions:manage`, `jobs:update-status` with migration seed
- Interview email templates with dynamic details and Google Calendar links
- Job hold/active status toggle for employers
- Zoom credentials fallback for video conferencing
- Chat list role-based participant filtering
- `scanKeys` Redis utility in `@ai-job-portal/common`
- Subscription carry-forward on same-plan repurchase
- `one_time` subscription plans — no expiry (`end_date` nullable)

### Fixed
- Share job email issue
- Recommendation cache stale data — invalidate on job add/edit/delete/status change
- Super employer permission error when publishing member-created jobs
- Featured job limit not updating on non-featured job edit
- Subscription check uses company ID instead of employer ID
- Preview plan details before payment
- Redis cache issue and permission rename consistency

### Database Migrations
- `0018` — seed RBAC permissions (buy subscription, job status)
- `0019` — rename `MANAGE_SUBSCRIPTIONS` → `subscriptions:manage`
- `0020` — `end_date` nullable on subscriptions (one_time plans)
- `0021` — seed interview calendar link template variable
- `0022` — update interview email templates with dynamic content

## 2026-04-01 — Structured Backend Logging

### Added
- `LOG_LEVEL` env variable support (debug|info|warn|error|silent) in CustomLogger
- `LOG_FORMAT=json` option for structured JSON output (CloudWatch-friendly)
- Sensitive data masking in logs (password, token, otp, secret, apikey)
- Drizzle ORM query logging for dev/staging (gated by LOG_LEVEL)
- Database pool error monitoring
- Slow request detection (>3s) in LoggingInterceptor
- User ID tracking in HTTP request/error logs
- Error path logging with catchError in LoggingInterceptor
- 4xx warning logs in HttpExceptionFilter (was only 5xx)
- CustomLogger + LoggingInterceptor added to all 9 backend services

### Fixed
- Replaced 47+ scattered `console.log` calls with structured logger in auth-service, admin-service, notification-service, user-service
- Removed sensitive data leaks (OTPs, tokens, phone numbers) from debug logs

### Environment Variables
- `LOG_LEVEL` — controls verbosity (default: prod=warn, dev/staging=debug)
- `LOG_FORMAT` — set to `json` for structured output
