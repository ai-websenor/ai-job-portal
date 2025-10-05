import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { UserService } from '../../user/services/user.service';
import { SessionService } from '../../session/services/session.service';
import { EmailService } from '../../email/services/email.service';
import { DatabaseService } from '../../database/database.service';
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

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Create session
    await this.sessionService.createSession(
      user.id,
      tokens.accessToken,
      tokens.refreshToken,
      ipAddress,
      userAgent,
    );

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

    // Generate new tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

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
  private async generateTokens(userId: string, email: string, role: string) {
    const accessTokenPayload: JwtPayload = {
      sub: userId,
      email,
      role: role as any,
    };

    const sessionId = nanoid();
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
}
