# Authentication Service

Comprehensive authentication and authorization microservice for the AI Job Portal platform.

## Features

### Core Authentication
- ✅ Email/password registration and login
- ✅ Password hashing with bcrypt (10+ rounds)
- ✅ JWT access and refresh tokens
- ✅ Session management with database persistence
- ✅ Email verification with token-based activation
- ✅ Password reset flow with time-limited tokens
- ✅ Account lockout after failed login attempts (5 attempts, 15 min lockout)

### Multi-Factor Authentication
- ✅ OTP-based login via SMS (Twilio integration)
- ✅ 2FA with authenticator apps (TOTP using speakeasy)
- ✅ Backup codes for account recovery
- ✅ Trusted device management

### Social Authentication
- ✅ Google OAuth 2.0 integration
- ✅ LinkedIn OAuth 2.0 integration
- ✅ Automatic profile data mapping
- ✅ Account linking for existing users

### Security Features
- ✅ HTTPS/SSL enforcement
- ✅ Rate limiting per IP/user
- ✅ CSRF protection
- ✅ XSS protection via helmet
- ✅ SQL injection prevention (parameterized queries)
- ✅ Session tracking (IP, user agent, device info)
- ✅ Concurrent session limits (max 3 devices)

### Role-Based Access Control (RBAC)
- ✅ User roles: job_seeker, employer, admin, team_member
- ✅ Permission-based access control
- ✅ Guard implementations for routes
- ✅ Decorator-based authorization

## Tech Stack

- **Framework**: NestJS 10.x
- **Server**: Fastify 4.x
- **Database**: PostgreSQL with Drizzle ORM
- **Caching**: Redis (via ioredis)
- **Authentication**: Passport.js, JWT
- **Password Hashing**: bcrypt
- **2FA/TOTP**: speakeasy
- **SMS**: Twilio
- **Email**: SendGrid
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, class-transformer

## Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Update environment variables in .env file
```

## Environment Variables

See `.env.example` for all required environment variables.

### Critical Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_job_portal

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Twilio (optional)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# SendGrid (optional)
SENDGRID_API_KEY=your-sendgrid-api-key
```

## Development

```bash
# Development mode with hot reload
pnpm dev

# Build
pnpm build

# Production mode
pnpm start
```

## API Documentation

Once the service is running, visit: `http://localhost:3001/api/docs`

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - Email/password login
- `POST /api/v1/auth/logout` - Logout current session
- `POST /api/v1/auth/logout/all` - Logout all sessions
- `POST /api/v1/auth/refresh` - Refresh access token

### OTP/Mobile Login

- `POST /api/v1/auth/login/otp` - Request OTP
- `POST /api/v1/auth/login/otp/verify` - Verify OTP

### Social Login

- `POST /api/v1/auth/social/google` - Google OAuth
- `GET /api/v1/auth/social/google/callback` - Google OAuth callback
- `POST /api/v1/auth/social/linkedin` - LinkedIn OAuth
- `GET /api/v1/auth/social/linkedin/callback` - LinkedIn OAuth callback

### Password Management

- `POST /api/v1/auth/password/reset` - Request password reset
- `POST /api/v1/auth/password/reset/verify` - Verify reset token and set new password

### Email Verification

- `POST /api/v1/auth/verify-email` - Verify email address
- `POST /api/v1/auth/verify-email/resend` - Resend verification email

### Two-Factor Authentication

- `POST /api/v1/auth/2fa/enable` - Enable 2FA
- `POST /api/v1/auth/2fa/disable` - Disable 2FA
- `POST /api/v1/auth/2fa/verify` - Verify 2FA code

### Session Management

- `GET /api/v1/auth/sessions` - List active sessions
- `DELETE /api/v1/auth/sessions/:id` - Revoke specific session

## Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

## Security Best Practices

1. **Never commit** `.env` files
2. **Always use** strong JWT secrets in production
3. **Enable** HTTPS in production
4. **Configure** CORS properly for your frontend domain
5. **Set up** rate limiting based on your traffic
6. **Monitor** failed login attempts
7. **Regularly update** dependencies for security patches

## Database Schema

The service uses the following tables from the shared database package:

- `users` - User accounts
- `social_logins` - Social authentication data
- `sessions` - Active user sessions
- `password_resets` - Password reset tokens
- `email_verifications` - Email verification tokens

## Architecture

```
src/
├── auth/          # Authentication logic
├── user/          # User management
├── session/       # Session management
├── otp/           # OTP/SMS service
├── social/        # Social OAuth
├── email/         # Email service
├── config/        # Configuration
├── database/      # Database connection
├── common/        # Shared utilities
└── main.ts        # Application entry
```

## Deployment

### Docker

```bash
docker build -t auth-service .
docker run -p 3001:3001 auth-service
```

### Kubernetes

See deployment manifests in `/k8s` directory.

## Support

For issues and questions:
- Check the [main project documentation](../../DOCS/CLAUDE.md)
- Review [EPIC-01 specifications](../../DOCS/EPICS/EPIC-01-USER-AUTHENTICATION.md)

## License

Proprietary - AI Job Portal
