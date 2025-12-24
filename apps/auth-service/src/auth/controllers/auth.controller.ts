import { Controller, Post, Body, UseGuards, Get, Delete, Param, HttpCode, HttpStatus, Req, NotFoundException, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { Public } from "@ai-job-portal/common";
import { AuthService } from "../services/auth.service";
import { SessionService } from "../../session/services/session.service";
import { RegisterDto } from "../dto/register.dto";
import { LoginDto } from "../dto/login.dto";
import { RequestPasswordResetDto, ResetPasswordDto } from "../dto/password-reset.dto";
import { VerifyEmailDto, ResendVerificationDto } from "../dto/verify-email.dto";
import { RequestOtpDto, VerifyOtpDto } from "../dto/otp.dto";
import { Enable2FADto, Verify2FADto, Disable2FADto } from "../dto/two-factor.dto";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { GetUser } from "../../common/decorators/get-user.decorator";
import { IpAddress } from "../../common/decorators/ip-address.decorator";
import { UserAgent } from "../../common/decorators/user-agent.decorator";
import { RefreshTokenDto } from "../dto/refresh-token.dto";
import { LogoutDto } from "../dto/logout.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService
  ) {}

  @Post("register")
  @Public()
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: 201, description: "User registered successfully" })
  @ApiResponse({ status: 409, description: "User already exists" })
  async register(@Body() dto: RegisterDto) {
    console.log(dto, "<---------");
    return this.authService.register(dto);
  }

  @Post("login")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() dto: LoginDto, @IpAddress() ipAddress: string, @UserAgent() userAgent: string) {
    return this.authService.login(dto, ipAddress, userAgent);
  }

  @Post("refresh")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiResponse({ status: 200, description: "Tokens refreshed successfully" })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto, @IpAddress() ipAddress: string, @UserAgent() userAgent: string) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken, ipAddress, userAgent);
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout from current session" })
  @ApiResponse({ status: 200, description: "Logged out successfully" })
  async logout(
    @GetUser("id") userId: string,
    @Body() logoutDto: LogoutDto // ✅ using DTO
  ) {
    return this.authService.logout(logoutDto.refreshToken);
  }

  @Post("logout/all")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout from all devices" })
  @ApiResponse({ status: 200, description: "Logged out from all devices" })
  async logoutAll(@GetUser("id") userId: string) {
    return this.authService.logoutAll(userId);
  }

  @Post("verify-email")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify email address" })
  @ApiResponse({ status: 200, description: "Email verified successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post("verify-email/resend")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend email verification" })
  @ApiResponse({ status: 200, description: "Verification email sent" })
  @ApiResponse({ status: 404, description: "User not found" })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post("password/reset")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request password reset" })
  @ApiResponse({ status: 200, description: "Password reset email sent if user exists" })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post("password/reset/verify")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password with token" })
  @ApiResponse({ status: 200, description: "Password reset successfully" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Get("sessions")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get all active sessions" })
  @ApiResponse({ status: 200, description: "List of active sessions" })
  async getSessions(@GetUser("id") userId: string) {
    const sessions = await this.sessionService.findUserSessions(userId);

    return {
      sessions: sessions.map((session) => ({
        id: session.id,
        ipAddress: session.ipAddress,
        deviceInfo: JSON.parse(session.deviceInfo),
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      })),
    };
  }

  @Delete("sessions/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Revoke a specific session" })
  @ApiResponse({ status: 200, description: "Session revoked successfully" })
  @ApiResponse({ status: 404, description: "Session not found" })
  @ApiResponse({ status: 403, description: "Session does not belong to user" })
  async revokeSession(@Param("id") sessionId: string, @GetUser("id") userId: string) {
    const session = await this.sessionService.findByIdAndUserId(sessionId, userId);

    if (!session) {
      // Check if session exists at all
      const sessionExists = await this.sessionService.findById(sessionId);
      if (!sessionExists) {
        throw new NotFoundException("Session not found");
      }
      throw new ForbiddenException("Session does not belong to user");
    }

    await this.sessionService.deleteSession(sessionId);
    return { message: "Session revoked successfully" };
  }

  // =============================================
  // OTP LOGIN ENDPOINTS
  // =============================================

  @Post("/otp")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request OTP for email login" })
  @ApiResponse({ status: 200, description: "OTP sent successfully" })
  @ApiResponse({ status: 429, description: "Too many requests" })
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto.email);
  }

  @Post("/otp/verify")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify OTP and login/register" })
  @ApiResponse({ status: 200, description: "Login successful" })
  @ApiResponse({ status: 401, description: "Invalid OTP" })
  async verifyOtp(@Body() dto: VerifyOtpDto, @IpAddress() ipAddress: string, @UserAgent() userAgent: string) {
    return this.authService.verifyOtpAndLogin(dto.email, dto.otp, ipAddress, userAgent);
  }

  // =============================================
  // TWO-FACTOR AUTHENTICATION ENDPOINTS
  // =============================================

  @Post("2fa/enable")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Enable 2FA for user account" })
  @ApiResponse({ status: 200, description: "2FA setup initiated. Scan QR code to complete." })
  @ApiResponse({ status: 400, description: "2FA already enabled" })
  async enable2FA(@GetUser("id") userId: string, @Body() dto: Enable2FADto) {
    return this.authService.enable2FA(userId, dto.password);
  }

  @Post("2fa/verify")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify 2FA code to complete setup" })
  @ApiResponse({ status: 200, description: "2FA enabled successfully" })
  @ApiResponse({ status: 401, description: "Invalid 2FA code" })
  async verify2FA(@GetUser("id") userId: string, @Body() dto: Verify2FADto) {
    return this.authService.verify2FASetup(userId, dto.token);
  }

  @Post("2fa/disable")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Disable 2FA for user account" })
  @ApiResponse({ status: 200, description: "2FA disabled successfully" })
  @ApiResponse({ status: 401, description: "Invalid credentials or 2FA code" })
  async disable2FA(@GetUser("id") userId: string, @Body() dto: Disable2FADto) {
    return this.authService.disable2FA(userId, dto.password, dto.token);
  }

  // =============================================
  // SOCIAL LOGIN ENDPOINTS
  // =============================================

  @Get("social/google")
  @Public()
  @ApiOperation({ summary: "Initiate Google OAuth login" })
  @ApiResponse({ status: 302, description: "Redirect to Google OAuth" })
  async googleAuth() {
    // This will be handled by Google strategy guard
    return { message: "Redirecting to Google OAuth..." };
  }

  @Get("social/google/callback")
  @Public()
  @ApiOperation({ summary: "Google OAuth callback" })
  @ApiResponse({ status: 200, description: "Login successful" })
  async googleAuthCallback(@Req() req: any, @IpAddress() ipAddress: string, @UserAgent() userAgent: string) {
    return this.authService.googleLogin(req.user, ipAddress, userAgent);
  }

  @Get("social/linkedin")
  @Public()
  @ApiOperation({ summary: "Initiate LinkedIn OAuth login" })
  @ApiResponse({ status: 302, description: "Redirect to LinkedIn OAuth" })
  async linkedinAuth() {
    // This will be handled by LinkedIn strategy guard
    return { message: "Redirecting to LinkedIn OAuth..." };
  }

  @Get("social/linkedin/callback")
  @Public()
  @ApiOperation({ summary: "LinkedIn OAuth callback" })
  @ApiResponse({ status: 200, description: "Login successful" })
  async linkedinAuthCallback(@Req() req: any, @IpAddress() ipAddress: string, @UserAgent() userAgent: string) {
    return this.authService.linkedinLogin(req.user, ipAddress, userAgent);
  }
}
