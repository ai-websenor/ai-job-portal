# Authentication Service - Next Steps

## What's Been Completed ✅

### 1. Project Foundation
- ✅ Complete project structure with NestJS/Fastify
- ✅ Package.json with all required dependencies
- ✅ TypeScript configuration
- ✅ Environment variable setup and validation
- ✅ Configuration module with type-safe config
- ✅ Database module with Drizzle ORM connection
- ✅ Fastify server setup with security (Helmet, CORS)
- ✅ Swagger/OpenAPI documentation configured
- ✅ Global validation pipes
- ✅ Comprehensive README

### 2. Database Integration
- ✅ Database module using existing Drizzle schema
- ✅ Database service wrapper
- ✅ All required tables configured:
  - users (with 2FA support)
  - social_logins (Google, LinkedIn)
  - sessions (with device tracking)
  - password_resets
  - email_verifications

### 3. Core Services
- ✅ **UserService** - Complete implementation:
  - User creation with email/password
  - Password hashing with bcrypt
  - User lookup (by email, by ID)
  - Password validation
  - Email verification
  - 2FA enable/disable
  - Account activation/deactivation
  - Last login tracking

- ✅ **SessionService** - Complete implementation:
  - Session creation with device info parsing
  - Session lookup (by token, by refresh token)
  - User sessions management
  - Token refresh
  - Session deletion (logout)
  - Concurrent session limits (max 3)
  - Session expiration validation
  - Cleanup for expired sessions

### 4. DTOs with Validation
- ✅ RegisterDto - Email/password registration
- ✅ LoginDto - Login credentials
- ✅ RequestOtpDto & VerifyOtpDto - OTP/SMS login
- ✅ RequestPasswordResetDto & ResetPasswordDto - Password reset
- ✅ VerifyEmailDto & ResendVerificationDto - Email verification
- ✅ Enable2FADto, Verify2FADto, Disable2FADto - Two-factor auth

### 5. Common Utilities
- ✅ JWT payload interfaces
- ✅ Auth user interfaces
- ✅ Device info interface
- ✅ Custom decorators (GetUser, IpAddress, UserAgent)

## What Needs to Be Implemented 🚧

### PHASE 1: Core Authentication (Priority: CRITICAL)

#### 1. JWT Module Setup
```typescript
// File: src/auth/auth.module.ts
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('app.jwt.secret'),
        signOptions: {
          expiresIn: config.get('app.jwt.accessTokenExpiration'),
        },
      }),
    }),
  ],
})
```

#### 2. Authentication Strategies

**Local Strategy** (`src/auth/strategies/local.strategy.ts`):
- Validate email/password
- Return user on success
- Throw UnauthorizedException on failure

**JWT Strategy** (`src/auth/strategies/jwt.strategy.ts`):
- Extract JWT from Authorization header
- Validate token signature
- Return user payload

**JWT Refresh Strategy** (`src/auth/strategies/jwt-refresh.strategy.ts`):
- Extract refresh token
- Validate session exists
- Return user and session info

#### 3. Auth Service (`src/auth/services/auth.service.ts`)

**Core Methods to Implement**:
```typescript
// Registration
- register(dto: RegisterDto): Promise<{ user, tokens }>
  - Create user via UserService
  - Create email verification token
  - Send verification email
  - Generate access & refresh tokens
  - Create session
  - Return user + tokens

// Login
- login(dto: LoginDto, ipAddress, userAgent): Promise<{ user, tokens }>
  - Find user by email
  - Validate password
  - Check account status (active, verified, locked)
  - Track login attempts
  - Enforce account lockout
  - Update last login
  - Generate tokens
  - Create session
  - Return user + tokens

// Token Management
- generateTokens(user): Promise<{ accessToken, refreshToken }>
- refreshTokens(refreshToken): Promise<{ accessToken, refreshToken }>
- revokeToken(token): Promise<void>

// Password Management
- requestPasswordReset(email): Promise<void>
  - Generate reset token
  - Save to password_resets table
  - Send reset email
- resetPassword(token, newPassword): Promise<void>
  - Validate token
  - Update password
  - Invalidate all sessions

// Email Verification
- verifyEmail(token): Promise<void>
- resendVerification(email): Promise<void>
```

#### 4. Guards (`src/auth/guards/`)

**JwtAuthGuard**:
```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Check for @Public() decorator
    // Call super.canActivate()
  }
}
```

**RolesGuard**:
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    // Get required roles from @Roles() decorator
    // Get user from request
    // Check if user.role matches required roles
  }
}
```

#### 5. Auth Controller (`src/auth/controllers/auth.controller.ts`)

**Endpoints to Create**:
```typescript
@Controller('auth')
export class AuthController {
  @Post('register')
  @Public()
  async register(@Body() dto: RegisterDto) {}

  @Post('login')
  @Public()
  async login(
    @Body() dto: LoginDto,
    @IpAddress() ip: string,
    @UserAgent() ua: string,
  ) {}

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@GetUser() user, @GetUser('sessionId') sessionId) {}

  @Post('refresh')
  @Public()
  async refresh(@Body('refreshToken') token: string) {}
}
```

### PHASE 2: Email & OTP Services (Priority: HIGH)

#### 6. Email Service (`src/email/services/email.service.ts`)

**SendGrid Integration**:
```typescript
- sendWelcomeEmail(user)
- sendVerificationEmail(user, token)
- sendPasswordResetEmail(user, token)
- sendLoginAlert(user, ipAddress, device)
- sendAccountLockedEmail(user)
- send2FAEnabledEmail(user)
```

#### 7. OTP Service (`src/otp/services/otp.service.ts`)

**Twilio Integration**:
```typescript
- generateOTP(mobile): Promise<string>
- sendOTP(mobile, otp): Promise<void>
- verifyOTP(mobile, otp): Promise<boolean>
- Rate limiting (3 OTP per 15 min)
- OTP expiry (5 minutes)
- Store OTPs in Redis
```

#### 8. OTP Controllers
```typescript
@Post('login/otp')
@Public()
async requestOTP(@Body() dto: RequestOtpDto) {}

@Post('login/otp/verify')
@Public()
async verifyOTP(
  @Body() dto: VerifyOtpDto,
  @IpAddress() ip,
  @UserAgent() ua,
) {}
```

### PHASE 3: Two-Factor Authentication (Priority: MEDIUM)

#### 9. TwoFactor Service (`src/auth/services/two-factor.service.ts`)

**TOTP Implementation**:
```typescript
- generateSecret(userId): Promise<{ secret, qrCode }>
- verifyToken(userId, token): Promise<boolean>
- generateBackupCodes(userId): Promise<string[]>
- validateBackupCode(userId, code): Promise<boolean>
- disable2FA(userId): Promise<void>
```

#### 10. 2FA Controllers
```typescript
@Post('2fa/enable')
@UseGuards(JwtAuthGuard)
async enable2FA(@GetUser('id') userId, @Body() dto: Enable2FADto) {}

@Post('2fa/verify')
@UseGuards(JwtAuthGuard)
async verify2FA(@GetUser('id') userId, @Body() dto: Verify2FADto) {}

@Post('2fa/disable')
@UseGuards(JwtAuthGuard)
async disable2FA(@GetUser('id') userId, @Body() dto: Disable2FADto) {}
```

### PHASE 4: Social Login (Priority: MEDIUM)

#### 11. Google OAuth Strategy
```typescript
// src/social/strategies/google.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
```

#### 12. LinkedIn OAuth Strategy
```typescript
// src/social/strategies/linkedin.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-linkedin-oauth2';
```

#### 13. Social Auth Service
```typescript
- handleSocialLogin(provider, profile): Promise<{ user, tokens }>
  - Find or create user
  - Create/update social_logins record
  - Generate tokens
  - Create session
```

#### 14. Social Controllers
```typescript
@Get('social/google')
@UseGuards(AuthGuard('google'))
async googleAuth() {}

@Get('social/google/callback')
@UseGuards(AuthGuard('google'))
async googleCallback(@Req() req) {}

@Get('social/linkedin')
@UseGuards(AuthGuard('linkedin'))
async linkedinAuth() {}

@Get('social/linkedin/callback')
@UseGuards(AuthGuard('linkedin'))
async linkedinCallback(@Req() req) {}
```

## Installation & Setup

### 1. Install Dependencies
```bash
# From project root
pnpm install

# Or from auth-service directory
cd apps/auth-service
pnpm install
```

### 2. Set Up Environment
```bash
cd apps/auth-service
cp .env.example .env
# Edit .env with your actual credentials
```

### 3. Database Setup
```bash
# Run migrations (from database package)
cd ../../packages/database
pnpm db:push

# Or generate migrations
pnpm db:generate
pnpm db:migrate
```

### 4. Start Development Server
```bash
cd apps/auth-service
pnpm dev
```

The service will be available at `http://localhost:3001`
Swagger docs at `http://localhost:3001/api/docs`

## Development Workflow

### 1. Implement Features in Order
Follow PHASE 1 → PHASE 2 → PHASE 3 → PHASE 4

### 2. Test Each Component
```bash
# Unit tests
pnpm test

# Specific service test
pnpm test -- user.service.spec.ts

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov
```

### 3. Manual Testing
Use Swagger UI at `/api/docs` to test endpoints

### 4. Example Test Flow

**Registration & Login Flow**:
1. POST `/auth/register` with email/password
2. Check email for verification link (or use token from logs in dev)
3. POST `/auth/verify-email` with token
4. POST `/auth/login` with credentials
5. Receive access_token and refresh_token
6. Use access_token in Authorization header for protected routes

**Password Reset Flow**:
1. POST `/auth/password/reset` with email
2. Check email for reset link/token
3. POST `/auth/password/reset/verify` with token + new password
4. Try logging in with new password

**2FA Flow**:
1. Login and get access_token
2. POST `/auth/2fa/enable` (returns QR code)
3. Scan QR with authenticator app
4. POST `/auth/2fa/verify` with TOTP code
5. 2FA is now enabled
6. Next login requires TOTP code

## Helpful Tips

### Database Queries
Use Drizzle's query builder for type-safe queries:
```typescript
// Select
const users = await db.select().from(users).where(eq(users.email, email));

// Insert
const [user] = await db.insert(users).values({...}).returning();

// Update
const [updated] = await db.update(users)
  .set({ isVerified: true })
  .where(eq(users.id, id))
  .returning();

// Delete
await db.delete(users).where(eq(users.id, id));
```

### JWT Token Generation
```typescript
const accessToken = this.jwtService.sign(
  { sub: user.id, email: user.email, role: user.role },
  { expiresIn: '15m' }
);

const refreshToken = this.jwtService.sign(
  { sub: user.id, sessionId: session.id },
  { expiresIn: '7d' }
);
```

### Testing Guards
```typescript
// In tests
const mockGuard = { canActivate: jest.fn(() => true) };
app.useGlobalGuards(mockGuard);
```

## Common Issues & Solutions

### 1. "Cannot find module '@ai-job-portal/database'"
```bash
# Build the database package first
cd packages/database
pnpm build
```

### 2. "Cannot find module '@ai-job-portal/common'"
```bash
# Build the common package first
cd packages/common
pnpm build
```

### 3. Database Connection Errors
- Verify DATABASE_URL in .env
- Ensure PostgreSQL is running
- Check database exists

### 4. Redis Connection Errors
- Verify Redis is running: `redis-cli ping`
- Check REDIS_HOST and REDIS_PORT in .env

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Passport.js](http://www.passportjs.org/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Fastify](https://www.fastify.io/)
- [EPIC-01 Specifications](../../DOCS/EPICS/EPIC-01-USER-AUTHENTICATION.md)

## Questions?

Refer to:
- [README.md](./README.md) - General overview
- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Detailed status
- Main project docs in `/DOCS` directory
