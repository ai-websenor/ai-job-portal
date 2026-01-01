import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { eq } from "drizzle-orm";
import { UserService } from "../../user/services/user.service";
import { SessionService } from "../../session/services/session.service";
import { EmailService } from "../../email/services/email.service";
import { DatabaseService } from "../../database/database.service";
import { OtpService } from "../../otp/otp.service";
import { SmsService } from "../../sms/sms.service";
import { TwoFactorService } from "../../two-factor/two-factor.service";
import { ProfileClientService } from "../../clients/profile-client.service";
import { RegisterDto } from "../dto/register.dto";
import { LoginDto } from "../dto/login.dto";
import { JwtPayload, JwtRefreshPayload, EmailVerificationPayload, PasswordResetPayload } from "../../common/interfaces/jwt-payload.interface";
import { emailVerifications, passwordResets } from "@ai-job-portal/database";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
    private readonly otpService: OtpService,
    private readonly smsService: SmsService,
    private readonly twoFactorService: TwoFactorService,
    private readonly profileClientService: ProfileClientService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService
  ) { }

  /**
   * Register a new user
   */
  async register(dto: RegisterDto) {
    const { firstName, lastName, mobile, email, password, confirmPassword, role } = dto;

    const userExist = await this.userService.findByEmail(dto.email);

    if (userExist) {
      throw new UnauthorizedException("Email already exists");
    }

    // 1️⃣ Check password match
    if (password !== confirmPassword) {
      throw new BadRequestException("Passwords do not match");
    }

    // 2️⃣ Create user (role can be defaulted inside service)
    const user = await this.userService.createUser({
      firstName,
      lastName,
      mobile,
      email,
      password,
      role,
    });

    if (user) {
      this.requestOtp(email).catch((err) => {
        this.logger.warn(`Failed to send OTP to ${email}: ${err.message}`);
      });
    }

    // 3️⃣ Create profile in user-service
    let profileCreated = false;
    try {
      const profileResult = await this.profileClientService.createProfile(
        user.id,
        user.email,
        user.role,
        {
          firstName,
          lastName,
          phone: mobile,
        },
      );
      this.logger.log(`Profile creation result for user ${user.id}: ${JSON.stringify(profileResult)}`);
      profileCreated = !!profileResult;
      if (!profileCreated) {
        this.logger.warn(`Profile creation returned falsy value for user ${user.id}`);
      }
    } catch (error) {
      // Profile creation errors are logged in ProfileClientService
      // We don't want to block registration if profile creation fails
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Profile creation failed for user ${user.id}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
    }

    // 4️⃣ Generate email verification token
    const verificationToken = await this.generateEmailVerificationToken(user.id, user.email);

    // 5️⃣ Send verification email
    const emailSent = await this.emailService.sendVerificationEmail(user.email, firstName, verificationToken);

    // 6️⃣ Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      statusCode: 201, // Created
      user: userWithoutPassword,
      message: emailSent ? "Registration successful. Please check your email to verify your account." : "Registration successful. Verification email will be sent shortly.",
      profileCreated, // Indicate if profile was created successfully
    };
  }

  /**
   * Login with email and password
   */
  async login(dto: LoginDto, ipAddress: string, userAgent: string) {
    // Find user
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    // Validate password
    const isPasswordValid = await this.userService.validatePassword(user, dto.password);

    if (!isPasswordValid) {
      // TODO: Track failed login attempts and implement account lockout
      throw new UnauthorizedException("Invalid credentials");
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    if (!user.isVerified) {
      this.requestOtp(dto.email).catch((err) => {
        this.logger.warn(`Failed to send OTP to ${dto.email}: ${err.message}`);
      });

      return {
        status: 403,
        message: "Email is not verified",
        isVerified: false,
      };

    }

    // Create session first to get sessionId
    const session = await this.sessionService.createSessionWithoutTokens(user.id, ipAddress, userAgent);

    // Generate tokens with sessionId
    const tokens = await this.generateTokens(user.id, user.email, user.role, session.id);

    // Update session with tokens
    await this.sessionService.updateSessionTokens(session.id, tokens.accessToken, tokens.refreshToken);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return {
      status: 200,
      message: "Login successful.",
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshTokens(refreshToken: string, ipAddress: string, userAgent: string) {
    // Verify refresh token
    let payload: JwtRefreshPayload;
    try {
      payload = this.jwtService.verify<JwtRefreshPayload>(refreshToken);
      console.log("...............>>> ", payload);
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Find session
    const session = await this.sessionService.findByRefreshToken(refreshToken);

    if (!session) {
      throw new UnauthorizedException("Session not found");
    }

    if (!this.sessionService.isSessionValid(session)) {
      await this.sessionService.deleteSession(session.id);
      throw new UnauthorizedException("Session expired");
    }

    // Get user
    const user = await this.userService.findById(payload.sub);

    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    // Generate new tokens with same sessionId
    const tokens = await this.generateTokens(user.id, user.email, user.role, session.id);

    // Update session with new tokens
    await this.sessionService.updateSessionTokens(session.id, tokens.accessToken, tokens.refreshToken);

    return tokens;
  }

  /**
   * Verify JWT access token (for gRPC)
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      return payload;
    } catch (error) {
      throw new UnauthorizedException("Invalid token");
    }
  }

  /**
   * Logout (delete session)
   */
  async logout(token: string) {
    await this.sessionService.deleteByToken(token);
    return { message: "Logged out successfully" };
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string) {
    await this.sessionService.deleteAllUserSessions(userId);
    return { message: "Logged out from all devices" };
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string) {
    // Verify token
    let payload: EmailVerificationPayload;
    try {
      payload = this.jwtService.verify<EmailVerificationPayload>(token);
    } catch (error) {
      throw new BadRequestException("Invalid or expired verification token");
    }

    // Find verification record
    const [verification] = await this.databaseService.db.select().from(emailVerifications).where(eq(emailVerifications.token, token)).limit(1);

    if (!verification) {
      throw new BadRequestException("Verification token not found");
    }

    if (verification.verifiedAt) {
      throw new BadRequestException("Email already verified");
    }

    if (new Date() > new Date(verification.expiresAt)) {
      throw new BadRequestException("Verification token expired");
    }

    // Verify user email
    await this.userService.verifyEmail(payload.sub);

    // Mark verification as used
    await this.databaseService.db.update(emailVerifications).set({ verifiedAt: new Date() }).where(eq(emailVerifications.id, verification.id));

    return { message: "Email verified successfully" };
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.isVerified) {
      throw new BadRequestException("Email already verified");
    }

    // Generate new verification token
    const verificationToken = await this.generateEmailVerificationToken(user.id, user.email);

    // Send verification email
    const emailSent = await this.emailService.sendVerificationEmail(user.email, user.email.split("@")[0], verificationToken);

    return {
      message: emailSent ? "Verification email sent successfully" : "Verification email will be sent shortly",
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      // Don't reveal that user doesn't exist
      return { message: "If the email exists, a password reset link has been sent" };
    }

    // Generate password reset token
    const resetToken = await this.generatePasswordResetToken(user.id, user.email);

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(user.email, user.email.split("@")[0], resetToken);

    return {
      message: "If the email exists, a password reset link has been sent",
    };
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string) {
    // Verify token
    let payload: PasswordResetPayload;
    try {
      payload = this.jwtService.verify<PasswordResetPayload>(token);
    } catch (error) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    // Find reset record
    const [reset] = await this.databaseService.db.select().from(passwordResets).where(eq(passwordResets.token, token)).limit(1);

    if (!reset) {
      throw new BadRequestException("Reset token not found");
    }

    if (new Date() > new Date(reset.expiresAt)) {
      throw new BadRequestException("Reset token expired");
    }

    // Update password
    await this.userService.updatePassword(payload.sub, newPassword);

    // Delete reset token
    await this.databaseService.db.delete(passwordResets).where(eq(passwordResets.id, reset.id));

    // Logout from all devices (invalidate all sessions)
    await this.sessionService.deleteAllUserSessions(payload.sub);

    return { message: "Password reset successfully" };
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(userId: string, email: string, role: string, sessionId: string) {
    const accessTokenPayload: JwtPayload = {
      sub: userId,
      email,
      role: role as any,
      sessionId,
    };

    const refreshTokenPayload: JwtRefreshPayload = {
      sub: userId,
      sessionId,
    };

    const accessTokenExpiration = this.configService.get<string>("app.jwt.accessTokenExpiration");

    const refreshTokenExpiration = this.configService.get<string>("app.jwt.refreshTokenExpiration");

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: accessTokenExpiration, // from .env
    });

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: refreshTokenExpiration, // from .env
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenExpiration,
      refreshTokenExpiresIn: refreshTokenExpiration,
    };
  }

  /**
   * Generate email verification token
   */
  private async generateEmailVerificationToken(userId: string, email: string): Promise<string> {
    const payload: EmailVerificationPayload = {
      sub: userId,
      email,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>("app.jwt.emailVerificationExpiration"),
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    // Store verification token
    await this.databaseService.db.insert(emailVerifications).values({
      userId,
      token,
      expiresAt,
    });

    return token;
  }

  /**
   * Generate password reset token
   */
  private async generatePasswordResetToken(userId: string, email: string): Promise<string> {
    const payload: PasswordResetPayload = {
      sub: userId,
      email,
    };

    // ## For production

    // const token = this.jwtService.sign(payload, {
    //   expiresIn: this.configService.get<string>("app.jwt.passwordResetExpiration"),
    // });

    // ## ends here

    //  **** For development purpose need to remove this later
    const isDevelopment =
      this.configService.get<string>('NODE_ENV') === 'development';

    const token = isDevelopment
      ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzYzUzYmYxYS0yYjExLTQ5YjItYTk0Zi1kMzllZjRjMzkxYzQiLCJlbWFpbCI6InRyYXNodGVtcG1haWw0NUBnbWFpbC5jb20iLCJpYXQiOjE3NjcyNTIwMjAsImV4cCI6MTc2NzI1NTYyMH0.oF3sJTyfwN-NHVmo9CyCVx0lI-wwALbh5LNAsFa5rXM'
      : this.jwtService.sign(payload, {
        expiresIn: this.configService.get<string>(
          'app.jwt.passwordResetExpiration',
        ),
      });

    // **** end here

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    // Delete any existing reset tokens for this user
    await this.databaseService.db.delete(passwordResets).where(eq(passwordResets.userId, userId));

    // Store reset token
    await this.databaseService.db.insert(passwordResets).values({
      userId,
      token,
      expiresAt,
    });

    return token;
  }

  // =============================================
  // OTP LOGIN METHODS
  // =============================================

  /**
   * Request OTP for mobile login
   */
  async requestOtp(email: string) {
    const normalizedEmail = email.toLowerCase().trim();

    // Check resend limit
    const canResend = await this.otpService.canResendOtp(normalizedEmail);

    if (!canResend) {
      throw new BadRequestException("Please wait 60 seconds before requesting a new OTP");
    }

    // Generate OTP
   
    const otp = await this.otpService.createOtp(normalizedEmail);
    console.log("NODE>>>>>>>>>>>>>>>>>>>", process.env.NODE_ENV);
    console.log("...............................>>>>>OTP", otp);

    // Send OTP via Email
    // const emailSent = await this.emailService.sendOtp(normalizedEmail, otp);
    const emailSent = false;

    return {
      message: emailSent ? "OTP sent successfully to your email" : "OTP generated. Email service temporarily unavailable.",
      email: normalizedEmail,
    };
  }

  /**
   * Verify OTP and login/register user
   */
  async verifyOtpAndLogin(email: string, otp: string, ipAddress: string, userAgent: string) {
    const normalizedEmail = email.toLowerCase().trim();
    console.log("user typed otp ---------->>>>>>>", otp);
    // Verify OTP
    await this.otpService.verifyOtp(normalizedEmail, otp);

    // Find or create user
    let user = await this.userService.findByEmail(normalizedEmail);

    if (!user) {
      // user = await this.userService.createUserWithEmail(normalizedEmail);
    }

    // Check account status
    if (!user.isActive) {
      throw new UnauthorizedException("Account is deactivated");
    }

    // Create session
    const session = await this.sessionService.createSessionWithoutTokens(user.id, ipAddress, userAgent);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role, session.id);

    // Update session with tokens
    await this.sessionService.updateSessionTokens(session.id, tokens.accessToken, tokens.refreshToken);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Mark email as verified
    if (!user.isVerified) {
      user = await this.userService.verifyEmail(user.id);
    }

    // Remove password before returning
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      message: "OTP is verified successfully",
      tokens,
    };
  }

  // =============================================
  // TWO-FACTOR AUTHENTICATION METHODS
  // =============================================

  /**
   * Enable 2FA for user
   */
  async enable2FA(userId: string, password: string) {
    // Get user
    const user = await this.userService.findById(userId);

    // Verify password
    const isPasswordValid = await this.userService.validatePassword(user, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid password");
    }

    // Check if 2FA already enabled
    if (user.twoFactorEnabled) {
      throw new BadRequestException("Two-factor authentication is already enabled");
    }

    // Generate 2FA secret and QR code
    const { secret, qrCode, backupCodes } = await this.twoFactorService.generateSecret(user.email || user.mobile);

    // Store secret temporarily (will be confirmed after user verifies)
    await this.userService.store2FASecret(userId, secret);

    return {
      secret,
      qrCode,
      backupCodes: backupCodes.map((code) => this.twoFactorService.formatBackupCode(code)),
      message: "Scan the QR code with your authenticator app and verify with a code to enable 2FA",
    };
  }

  /**
   * Verify and confirm 2FA setup
   */
  async verify2FASetup(userId: string, token: string) {
    // Get user
    const user = await this.userService.findById(userId);

    if (!user.twoFactorSecret) {
      throw new BadRequestException("2FA setup not initiated");
    }

    // Verify token
    const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret, token);

    if (!isValid) {
      throw new UnauthorizedException("Invalid 2FA code");
    }

    // Enable 2FA for user
    await this.userService.enable2FA(userId);

    // Send confirmation email
    await this.emailService.send2FAEnabledEmail(user.email, user.email?.split("@")[0] || "User", {
      enabledAt: new Date().toISOString(),
      device: "Current device",
      ipAddress: "Current IP",
    });

    return {
      message: "Two-factor authentication enabled successfully",
    };
  }

  /**
   * Verify 2FA token during login
   */
  async verify2FAToken(userId: string, token: string) {
    // Get user
    const user = await this.userService.findById(userId);

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException("Two-factor authentication is not enabled");
    }

    // Verify token
    const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret, token);

    if (!isValid) {
      throw new UnauthorizedException("Invalid 2FA code");
    }

    return {
      verified: true,
      message: "2FA verification successful",
    };
  }

  /**
   * Disable 2FA for user
   */
  async disable2FA(userId: string, password: string, token: string) {
    // Get user
    const user = await this.userService.findById(userId);

    // Verify password
    const isPasswordValid = await this.userService.validatePassword(user, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid password");
    }

    // Verify 2FA token
    if (!user.twoFactorSecret) {
      throw new BadRequestException("Two-factor authentication is not enabled");
    }

    const isTokenValid = this.twoFactorService.verifyToken(user.twoFactorSecret, token);
    if (!isTokenValid) {
      throw new UnauthorizedException("Invalid 2FA code");
    }

    // Disable 2FA
    await this.userService.disable2FA(userId);

    return {
      message: "Two-factor authentication disabled successfully",
    };
  }

  // =============================================
  // SOCIAL LOGIN METHODS
  // =============================================

  /**
   * Handle Google OAuth callback
   */
  async googleLogin(profile: any, ipAddress: string, userAgent: string) {
    const email = profile.emails[0].value;
    const googleId = profile.id;

    // Find or create user
    let user = await this.userService.findByEmail(email);

    if (!user) {
      // Create new user from Google profile
      user = await this.userService.createUserFromSocial({
        email,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        provider: "google",
        providerId: googleId,
        profilePhoto: profile.photos?.[0]?.value,
      });
    } else {
      // Link Google account if not already linked
      await this.userService.linkSocialAccount(user.id, "google", googleId);
    }

    // Auto-verify email for social login
    if (!user.isVerified) {
      await this.userService.verifyEmail(user.id);
    }

    // Create session first to get sessionId
    const session = await this.sessionService.createSessionWithoutTokens(user.id, ipAddress, userAgent);

    // Generate tokens with sessionId
    const tokens = await this.generateTokens(user.id, user.email, user.role, session.id);

    // Update session with tokens
    await this.sessionService.updateSessionTokens(session.id, tokens.accessToken, tokens.refreshToken);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Handle LinkedIn OAuth callback
   */
  async linkedinLogin(profile: any, ipAddress: string, userAgent: string) {
    const email = profile.emails[0].value;
    const linkedinId = profile.id;

    // Find or create user
    let user = await this.userService.findByEmail(email);

    if (!user) {
      // Create new user from LinkedIn profile
      user = await this.userService.createUserFromSocial({
        email,
        firstName: profile.name?.givenName,
        lastName: profile.name?.familyName,
        provider: "linkedin",
        providerId: linkedinId,
        profilePhoto: profile.photos?.[0]?.value,
      });
    } else {
      // Link LinkedIn account if not already linked
      await this.userService.linkSocialAccount(user.id, "linkedin", linkedinId);
    }

    // Auto-verify email for social login
    if (!user.isVerified) {
      await this.userService.verifyEmail(user.id);
    }

    // Create session first to get sessionId
    const session = await this.sessionService.createSessionWithoutTokens(user.id, ipAddress, userAgent);

    // Generate tokens with sessionId
    const tokens = await this.generateTokens(user.id, user.email, user.role, session.id);

    // Update session with tokens
    await this.sessionService.updateSessionTokens(session.id, tokens.accessToken, tokens.refreshToken);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }
}
