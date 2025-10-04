# EPIC-01: User Authentication & Authorization

## Epic Overview
Implement a comprehensive authentication and authorization system supporting multiple user types (Job Seekers, Employers, Admins) with various login methods and robust security features.

---

## Business Value
- Enable secure user access to the platform
- Support multiple authentication methods for user convenience
- Ensure role-based access control for different user types
- Provide security and data protection for all users

---

## User Stories

### US-01.1: Job Seeker Registration
**As a** job seeker
**I want to** register on the platform
**So that** I can create my profile and apply for jobs

**Acceptance Criteria:**
- User can register with email and password
- Email verification required before account activation
- Password must meet security requirements (min 8 chars, uppercase, lowercase, number, special char)
- Validation for duplicate email addresses
- Account activation link sent via email
- User redirected to profile creation after activation

---

### US-01.2: Social Login (Google & LinkedIn)
**As a** job seeker
**I want to** sign up/login using my Google or LinkedIn account
**So that** I can quickly access the platform without creating new credentials

**Acceptance Criteria:**
- User can authenticate via Google OAuth
- User can authenticate via LinkedIn OAuth
- Profile data auto-populated from social account (name, email, photo)
- New account created automatically on first social login
- Existing users can link social accounts to their profile
- User can choose which data to import from social account

---

### US-01.3: Mobile OTP Login
**As a** job seeker
**I want to** login using my mobile number with OTP
**So that** I can access my account without remembering passwords

**Acceptance Criteria:**
- User enters mobile number
- OTP sent via SMS within 30 seconds
- OTP valid for 5 minutes
- User can request OTP resend after 60 seconds
- Maximum 3 OTP requests per 15 minutes (rate limiting)
- Account created/logged in after OTP verification
- Mobile number verified and stored in profile

---

### US-01.4: Employer Registration
**As an** employer
**I want to** register my company on the platform
**So that** I can post jobs and find candidates

**Acceptance Criteria:**
- Employer registers with business email
- Company information collected during registration:
  - Company name
  - Industry
  - Company size
  - Location
  - Contact person details
- Email verification required
- Option to upload KYC documents (PAN, GST)
- Account pending verification status initially
- Email notification sent to admin for approval

---

### US-01.5: Password Reset
**As a** user
**I want to** reset my password if I forget it
**So that** I can regain access to my account

**Acceptance Criteria:**
- User clicks "Forgot Password" link
- User enters registered email address
- Password reset link sent via email
- Reset link valid for 1 hour
- User creates new password meeting security requirements
- Old password invalidated
- User receives confirmation email after successful reset
- All active sessions logged out (optional security feature)

---

### US-01.6: Two-Factor Authentication (2FA)
**As a** user
**I want to** enable two-factor authentication
**So that** my account is more secure

**Acceptance Criteria:**
- User can enable 2FA in account settings
- Support for SMS-based OTP
- Support for authenticator apps (Google Authenticator, Authy)
- Backup codes generated for account recovery
- 2FA required at each login after enabling
- User can disable 2FA with password + current 2FA code
- Trusted device option (remember for 30 days)

---

### US-01.7: Role-Based Access Control (RBAC)
**As a** platform administrator
**I want to** assign different roles with specific permissions
**So that** users have appropriate access levels

**Acceptance Criteria:**
- User roles defined:
  - Job Seeker (Candidate)
  - Employer (Company Admin)
  - Recruiter (Employer team member)
  - Super Admin
  - Moderator (optional)
- Each role has specific permissions matrix
- Dashboard and features vary based on user role
- Unauthorized access attempts blocked
- Role assignment managed by Super Admin
- Audit log for role changes

---

### US-01.8: Session Management
**As a** user
**I want** secure session management
**So that** my account remains protected

**Acceptance Criteria:**
- Secure session token generated on login (JWT)
- Session expires after 24 hours of inactivity
- User can view active sessions
- User can logout from all devices
- Session refresh without re-login (if within validity)
- Concurrent session limits (max 3 devices)
- IP address and device tracking per session

---

### US-01.9: Account Lockout (Security)
**As a** system
**I want to** temporarily lock accounts after failed login attempts
**So that** brute-force attacks are prevented

**Acceptance Criteria:**
- Account locked after 5 consecutive failed login attempts
- Lockout duration: 15 minutes
- User notified via email about lockout
- User can unlock via email link or wait for timeout
- Admin can manually unlock accounts
- Failed attempt counter resets on successful login

---

### US-01.10: Email Verification
**As a** new user
**I want to** verify my email address
**So that** I can activate my account

**Acceptance Criteria:**
- Verification email sent immediately after registration
- Email contains activation link (valid for 24 hours)
- User clicks link to activate account
- User redirected to login page after verification
- Option to resend verification email
- Account cannot be fully used until email verified
- Verification status displayed in user profile

---

## Technical Requirements

### Authentication Methods
1. **Email/Password**
   - Bcrypt password hashing (minimum 10 rounds)
   - Secure password storage (never plain text)
   - Password complexity validation

2. **OAuth Integration**
   - Google OAuth 2.0
   - LinkedIn OAuth 2.0
   - Secure token handling
   - Profile data mapping

3. **OTP Authentication**
   - SMS gateway integration (Twilio/MSG91)
   - OTP generation (6-digit random)
   - OTP expiry and rate limiting
   - Fallback options if SMS fails

### Security Features
- JWT (JSON Web Tokens) for session management
- Refresh token rotation
- HTTPS/SSL enforcement
- CSRF protection
- XSS protection
- SQL injection prevention (parameterized queries)
- Rate limiting for login attempts
- Captcha for suspicious activities (Google reCAPTCHA v3)

### Database Schema

**Users Table:**
```sql
users (
  id: UUID PRIMARY KEY,
  email: VARCHAR(255) UNIQUE NOT NULL,
  mobile: VARCHAR(20) UNIQUE,
  password_hash: VARCHAR(255),
  role: ENUM('job_seeker', 'employer', 'admin'),
  is_email_verified: BOOLEAN DEFAULT false,
  is_mobile_verified: BOOLEAN DEFAULT false,
  is_active: BOOLEAN DEFAULT true,
  two_factor_enabled: BOOLEAN DEFAULT false,
  two_factor_secret: VARCHAR(255),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  last_login_at: TIMESTAMP
)
```

**Social Logins Table:**
```sql
social_logins (
  id: UUID PRIMARY KEY,
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  provider: ENUM('google', 'linkedin'),
  provider_user_id: VARCHAR(255),
  access_token: TEXT,
  refresh_token: TEXT,
  token_expires_at: TIMESTAMP,
  created_at: TIMESTAMP
)
```

**Sessions Table:**
```sql
sessions (
  id: UUID PRIMARY KEY,
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  token: VARCHAR(500) UNIQUE,
  refresh_token: VARCHAR(500) UNIQUE,
  ip_address: VARCHAR(45),
  user_agent: TEXT,
  device_info: JSONB,
  expires_at: TIMESTAMP,
  created_at: TIMESTAMP
)
```

**Password Resets Table:**
```sql
password_resets (
  id: UUID PRIMARY KEY,
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  token: VARCHAR(255) UNIQUE,
  expires_at: TIMESTAMP,
  created_at: TIMESTAMP
)
```

**Email Verifications Table:**
```sql
email_verifications (
  id: UUID PRIMARY KEY,
  user_id: UUID FOREIGN KEY REFERENCES users(id),
  token: VARCHAR(255) UNIQUE,
  expires_at: TIMESTAMP,
  verified_at: TIMESTAMP,
  created_at: TIMESTAMP
)
```

---

## API Endpoints

### Authentication APIs
```
POST   /api/v1/auth/register              - User registration
POST   /api/v1/auth/login                 - Email/password login
POST   /api/v1/auth/login/otp             - Request OTP
POST   /api/v1/auth/login/otp/verify      - Verify OTP
POST   /api/v1/auth/social/google         - Google OAuth
POST   /api/v1/auth/social/linkedin       - LinkedIn OAuth
POST   /api/v1/auth/logout                - Logout current session
POST   /api/v1/auth/logout/all            - Logout all sessions
POST   /api/v1/auth/refresh               - Refresh access token
POST   /api/v1/auth/password/reset        - Request password reset
POST   /api/v1/auth/password/reset/verify - Verify reset token and set new password
POST   /api/v1/auth/verify-email          - Verify email address
POST   /api/v1/auth/verify-email/resend   - Resend verification email
POST   /api/v1/auth/2fa/enable            - Enable 2FA
POST   /api/v1/auth/2fa/disable           - Disable 2FA
POST   /api/v1/auth/2fa/verify            - Verify 2FA code
GET    /api/v1/auth/sessions              - List active sessions
DELETE /api/v1/auth/sessions/:id          - Revoke specific session
```

---

## UI/UX Requirements

### Registration Page
- Clean, simple form layout
- Progressive disclosure (multi-step form)
- Real-time validation feedback
- Password strength indicator
- Terms & Conditions checkbox
- Social login buttons prominently displayed
- Mobile-responsive design

### Login Page
- Email/password fields
- "Remember me" checkbox
- "Forgot password?" link
- Social login options
- OTP login option
- Clear error messages
- Loading states during authentication

### Email Templates
1. **Welcome Email** (after registration)
2. **Email Verification** (activation link)
3. **Password Reset** (reset link)
4. **Login Alert** (new device/location)
5. **Account Locked** (security alert)
6. **2FA Enabled** (confirmation)

---

## Testing Requirements

### Unit Tests
- Password hashing and validation
- JWT token generation and verification
- OTP generation and validation
- Email validation
- Role permission checks

### Integration Tests
- Complete registration flow
- Login with email/password
- Social login flow (Google, LinkedIn)
- OTP login flow
- Password reset flow
- Email verification flow
- 2FA setup and verification
- Session management

### Security Tests
- Brute force attack prevention
- SQL injection attempts
- XSS attack prevention
- CSRF protection validation
- Session hijacking prevention
- Password strength enforcement

### Load Tests
- Concurrent login requests (1000+ users)
- OTP sending under high load
- Session management at scale

---

## Dependencies

### External Services
- **SMS Gateway:** Twilio or MSG91 (for OTP)
- **Email Service:** SendGrid or AWS SES (for transactional emails)
- **OAuth Providers:** Google, LinkedIn APIs

### Libraries/Packages
- bcrypt (password hashing)
- jsonwebtoken (JWT)
- passport.js or similar (OAuth)
- speakeasy or otplib (2FA/OTP)
- express-rate-limit (rate limiting)
- validator.js (input validation)

---

## Success Metrics

### Quantitative
- Registration completion rate > 85%
- Email verification rate > 90%
- Social login adoption > 40%
- Failed login rate < 5%
- 2FA adoption > 20%

### Qualitative
- User satisfaction with login process
- Reduced support tickets for login issues
- Minimal security incidents

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SMS delivery failures | High | Implement email OTP fallback |
| OAuth provider downtime | Medium | Graceful error handling, allow email login |
| Brute force attacks | High | Rate limiting, account lockout, Captcha |
| Token theft/session hijacking | High | Short token expiry, IP validation, HTTPS only |
| Email deliverability issues | Medium | Use reputable email service, monitor bounce rates |

---

## Acceptance Criteria (Epic Level)

- [ ] All user types can register successfully
- [ ] All authentication methods (email, social, OTP) working
- [ ] Email verification functional
- [ ] Password reset flow working
- [ ] 2FA can be enabled and works correctly
- [ ] Session management secure and functional
- [ ] RBAC enforced across the platform
- [ ] All security measures implemented (rate limiting, lockout, etc.)
- [ ] Comprehensive audit logging in place
- [ ] All API endpoints documented and tested
- [ ] UI/UX polished and responsive
- [ ] Performance benchmarks met (login < 2 seconds)
- [ ] Security audit passed
- [ ] All unit and integration tests passing

---

## Timeline Estimate
**Duration:** 3-4 weeks

### Week 1: Core Authentication
- Database schema setup
- Email/password registration and login
- JWT implementation
- Session management

### Week 2: Additional Auth Methods
- Social login (Google, LinkedIn)
- OTP/SMS integration
- Email verification
- Password reset

### Week 3: Security Features
- 2FA implementation
- Rate limiting
- Account lockout
- Security audit
- RBAC setup

### Week 4: Testing & Polish
- Comprehensive testing
- UI/UX refinement
- Documentation
- Bug fixes

---

## Related Epics
- EPIC-02: Job Seeker Profile Management (requires authentication)
- EPIC-03: Employer Profile Management (requires authentication)
- EPIC-04: Admin Panel (requires authentication with admin role)

---

**Epic Owner:** Backend Team Lead
**Stakeholders:** Product Manager, Security Team, UX Designer
**Priority:** Critical (Must have for platform launch)
