# Changelog

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
