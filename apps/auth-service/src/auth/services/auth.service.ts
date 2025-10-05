import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { UserService } from '../../user/services/user.service';
import { SessionService } from '../../session/services/session.service';
import { EmailService } from '../../email/services/email.service';
import { DatabaseService } from '../../database/database.service';
import { OtpService } from '../../otp/otp.service';
import { SmsService } from '../../sms/sms.service';
import { TwoFactorService } from '../../two-factor/two-factor.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { JwtPayload, JwtRefreshPayload, EmailVerificationPayload, PasswordResetPayload } from '../../common/interfaces/jwt-payload.interface';
import { emailVerifications, passwordResets } from '@ai-job-portal/database';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
    private readonly otpService: OtpService,
    private readonly smsService: SmsService,
    private readonly twoFactorService: TwoFactorService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Register a new user
   */
  async register(dto: RegisterDto) {
    // Create user
    const user = await this.userService.createUser(dto.email, dto.password, dto.role);

    // Generate email verification token
    const verificationToken = await this.generateEmailVerificationToken(user.id, user.email);

    // Send verification email
    const emailSent = await this.emailService.sendVerificationEmail(
      user.email,
      user.email.split('@')[0], // Use email prefix as firstName for now
      verificationToken,
    );

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      message: emailSent
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful. Verification email will be sent shortly.',
    };
  }

  /**
   * Login with email and password
   */
  async login(dto: LoginDto, ipAddress: string, userAgent: string) {
    // Find user
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await this.userService.validatePassword(user, dto.password);

    if (!isPasswordValid) {
      // TODO: Track failed login attempts and implement account lockout
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Create session first to get sessionId
    const session = await this.sessionService.createSessionWithoutTokens(
      user.id,
      ipAddress,
      userAgent,
    );

    // Generate tokens with sessionId
    const tokens = await this.generateTokens(user.id, user.email, user.role, session.id);

    // Update session with tokens
    await this.sessionService.updateSessionTokens(session.id, tokens.accessToken, tokens.refreshToken);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return {
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
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find session
    const session = await this.sessionService.findByRefreshToken(refreshToken);

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (!this.sessionService.isSessionValid(session)) {
      await this.sessionService.deleteSession(session.id);
      throw new UnauthorizedException('Session expired');
    }

    // Get user
    const user = await this.userService.findById(payload.sub);

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Generate new tokens with same sessionId
    const tokens = await this.generateTokens(user.id, user.email, user.role, session.id);

    // Update session with new tokens
    await this.sessionService.updateSessionTokens(session.id, tokens.accessToken, tokens.refreshToken);

    return tokens;
  }

  /**
   * Logout (delete session)
   */
  async logout(token: string) {
    await this.sessionService.deleteByToken(token);
    return { message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string) {
    await this.sessionService.deleteAllUserSessions(userId);
    return { message: 'Logged out from all devices' };
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
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Find verification record
    const [verification] = await this.databaseService.db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.token, token))
      .limit(1);

    if (!verification) {
      throw new BadRequestException('Verification token not found');
    }

    if (verification.verifiedAt) {
      throw new BadRequestException('Email already verified');
    }

    if (new Date() > new Date(verification.expiresAt)) {
      throw new BadRequestException('Verification token expired');
    }

    // Verify user email
    await this.userService.verifyEmail(payload.sub);

    // Mark verification as used
    await this.databaseService.db
      .update(emailVerifications)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerifications.id, verification.id));

    return { message: 'Email verified successfully' };
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new verification token
    const verificationToken = await this.generateEmailVerificationToken(user.id, user.email);

    // Send verification email
    const emailSent = await this.emailService.sendVerificationEmail(
      user.email,
      user.email.split('@')[0],
      verificationToken,
    );

    return {
      message: emailSent
        ? 'Verification email sent successfully'
        : 'Verification email will be sent shortly',
    };
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      // Don't reveal that user doesn't exist
      return { message: 'If the email exists, a password reset link has been sent' };
    }

    // Generate password reset token
    const resetToken = await this.generatePasswordResetToken(user.id, user.email);

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      user.email.split('@')[0],
      resetToken,
    );

    return {
      message: 'If the email exists, a password reset link has been sent',
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
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Find reset record
    const [reset] = await this.databaseService.db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.token, token))
      .limit(1);

    if (!reset) {
      throw new BadRequestException('Reset token not found');
    }

    if (new Date() > new Date(reset.expiresAt)) {
      throw new BadRequestException('Reset token expired');
    }

    // Update password
    await this.userService.updatePassword(payload.sub, newPassword);

    // Delete reset token
    await this.databaseService.db
      .delete(passwordResets)
      .where(eq(passwordResets.id, reset.id));

    // Logout from all devices (invalidate all sessions)
    await this.sessionService.deleteAllUserSessions(payload.sub);

    return { message: 'Password reset successfully' };
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

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: this.configService.get<string>('app.jwt.accessTokenExpiration'),
    });

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: this.configService.get<string>('app.jwt.refreshTokenExpiration'),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get<string>('app.jwt.accessTokenExpiration'),
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
      expiresIn: this.configService.get<string>('app.jwt.emailVerificationExpiration'),
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

    const token = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('app.jwt.passwordResetExpiration'),
    });

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    // Delete any existing reset tokens for this user
    await this.databaseService.db
      .delete(passwordResets)
      .where(eq(passwordResets.userId, userId));

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
  async requestOtp(mobile: string) {
    // Check if user can request OTP
    const canResend = await this.otpService.canResendOtp(mobile);

    if (!canResend) {
      throw new BadRequestException('Please wait 60 seconds before requesting a new OTP');
    }

    // Generate OTP
    const otp = await this.otpService.createOtp(mobile);

    // Send OTP via SMS
    const smsSent = await this.smsService.sendOtp(mobile, otp);

    return {
      message: smsSent
        ? 'OTP sent successfully to your mobile number'
        : 'OTP generated. SMS service temporarily unavailable.',
      mobile,
    };
  }

  /**
   * Verify OTP and login/register user
   */
  async verifyOtpAndLogin(mobile: string, otp: string, ipAddress: string, userAgent: string) {
    // Verify OTP
    await this.otpService.verifyOtp(mobile, otp);

    // Find or create user
    let user = await this.userService.findByMobile(mobile);

    if (!user) {
      // Create new user with mobile number
      user = await this.userService.createUserWithMobile(mobile);
    }

    // Check if account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Create session first to get sessionId
    const session = await this.sessionService.createSessionWithoutTokens(
      user.id,
      ipAddress,
      userAgent,
    );

    // Generate tokens with sessionId
    const tokens = await this.generateTokens(user.id, user.email || mobile, user.role, session.id);

    // Update session with tokens
    await this.sessionService.updateSessionTokens(session.id, tokens.accessToken, tokens.refreshToken);

    // Update last login
    await this.userService.updateLastLogin(user.id);

    // Mark mobile as verified
    if (!user.isMobileVerified) {
      await this.userService.verifyMobile(user.id);
    }

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
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
      throw new UnauthorizedException('Invalid password');
    }

    // Check if 2FA already enabled
    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    // Generate 2FA secret and QR code
    const { secret, qrCode, backupCodes } = await this.twoFactorService.generateSecret(
      user.email || user.mobile,
    );

    // Store secret temporarily (will be confirmed after user verifies)
    await this.userService.store2FASecret(userId, secret);

    return {
      secret,
      qrCode,
      backupCodes: backupCodes.map(code => this.twoFactorService.formatBackupCode(code)),
      message: 'Scan the QR code with your authenticator app and verify with a code to enable 2FA',
    };
  }

  /**
   * Verify and confirm 2FA setup
   */
  async verify2FASetup(userId: string, token: string) {
    // Get user
    const user = await this.userService.findById(userId);

    if (!user.twoFactorSecret) {
      throw new BadRequestException('2FA setup not initiated');
    }

    // Verify token
    const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret, token);

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Enable 2FA for user
    await this.userService.enable2FA(userId);

    // Send confirmation email
    await this.emailService.send2FAEnabledEmail(
      user.email,
      user.email?.split('@')[0] || 'User',
      {
        enabledAt: new Date().toISOString(),
        device: 'Current device',
        ipAddress: 'Current IP',
      },
    );

    return {
      message: 'Two-factor authentication enabled successfully',
    };
  }

  /**
   * Verify 2FA token during login
   */
  async verify2FAToken(userId: string, token: string) {
    // Get user
    const user = await this.userService.findById(userId);

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    // Verify token
    const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret, token);

    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    return {
      verified: true,
      message: '2FA verification successful',
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
      throw new UnauthorizedException('Invalid password');
    }

    // Verify 2FA token
    if (!user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const isTokenValid = this.twoFactorService.verifyToken(user.twoFactorSecret, token);
    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid 2FA code');
    }

    // Disable 2FA
    await this.userService.disable2FA(userId);

    return {
      message: 'Two-factor authentication disabled successfully',
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
        provider: 'google',
        providerId: googleId,
        profilePhoto: profile.photos?.[0]?.value,
      });
    } else {
      // Link Google account if not already linked
      await this.userService.linkSocialAccount(user.id, 'google', googleId);
    }

    // Auto-verify email for social login
    if (!user.isVerified) {
      await this.userService.verifyEmail(user.id);
    }

    // Create session first to get sessionId
    const session = await this.sessionService.createSessionWithoutTokens(
      user.id,
      ipAddress,
      userAgent,
    );

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
        provider: 'linkedin',
        providerId: linkedinId,
        profilePhoto: profile.photos?.[0]?.value,
      });
    } else {
      // Link LinkedIn account if not already linked
      await this.userService.linkSocialAccount(user.id, 'linkedin', linkedinId);
    }

    // Auto-verify email for social login
    if (!user.isVerified) {
      await this.userService.verifyEmail(user.id);
    }

    // Create session first to get sessionId
    const session = await this.sessionService.createSessionWithoutTokens(
      user.id,
      ipAddress,
      userAgent,
    );

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
