import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CustomLogger } from '@ai-job-portal/logger';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, Public } from '@ai-job-portal/common';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyEmailDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ResendVerificationDto,
  ResendVerifyEmailOtpDto,
  AuthResponseDto,
  MessageResponseDto,
  RegisterResponseDto,
  VerifyEmailResponseDto,
  VerifyMobileDto,
  ChangePasswordDto,
} from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new CustomLogger();

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, type: RegisterResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    this.logger.info('Registering new user', 'AuthController', {
      email: dto.email,
      role: dto.role,
    });
    const result = await this.authService.register(dto);
    this.logger.success('User registered successfully', 'AuthController', {
      userId: result.userId,
    });
    return result;
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<{ message: string; data: AuthResponseDto }> {
    this.logger.info('Login attempt', 'AuthController', { email: dto.email });
    const result = await this.authService.login(dto);
    this.logger.success('User logged in', 'AuthController', { email: dto.email });
    return { message: 'Login successful', data: result };
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const result = await this.authService.refreshToken(dto);
    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async logout(
    @CurrentUser('sub') userId: string,
    @Body('refreshToken') refreshToken?: string,
  ): Promise<MessageResponseDto> {
    this.logger.info('Logout request', 'AuthController', { userId });
    await this.authService.logout(userId, refreshToken);
    return { message: 'Logged out successfully' };
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with Cognito code' })
  @ApiResponse({ status: 200, type: VerifyEmailResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification code' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<VerifyEmailResponseDto> {
    this.logger.info('Verify email request', 'AuthController', { email: dto.email });
    return this.authService.verifyEmail(dto);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request password reset (Cognito sends code via email)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    this.logger.info('Forgot password request', 'AuthController', { email: dto.email });
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password with Cognito code' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid code or password requirements not met' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    this.logger.info('Reset password attempt', 'AuthController', { email: dto.email });
    return this.authService.resetPassword(dto);
  }

  @Post('resend-verification')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @ApiOperation({ summary: 'Resend verification email (by email)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async resendVerification(@Body() dto: ResendVerificationDto): Promise<MessageResponseDto> {
    this.logger.info('Resend verification email', 'AuthController', { email: dto.email });
    return this.authService.resendVerification(dto.email);
  }

  @Post('resend-verify-email-otp')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend email verification OTP (by email)' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async resendVerifyEmailOtp(@Body() dto: ResendVerifyEmailOtpDto): Promise<MessageResponseDto> {
    this.logger.info('Resend verify email OTP', 'AuthController', { email: dto.email });
    return this.authService.resendVerifyEmailOtp(dto);
  }

  @Post('send-mobile-otp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send OTP to mobile number via SMS' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'No mobile number or already verified' })
  async sendMobileOtp(@CurrentUser('sub') userId: string): Promise<MessageResponseDto> {
    this.logger.info('Send mobile OTP request', 'AuthController', { userId });
    return this.authService.sendMobileOtp(userId);
  }

  @Post('verify-mobile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify mobile with OTP' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyMobile(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyMobileDto,
  ): Promise<MessageResponseDto> {
    this.logger.info('Verify mobile request', 'AuthController', { userId });
    return this.authService.verifyMobile(userId, dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid current password or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - must be logged in' })
  async changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    this.logger.info('Change password request', 'AuthController', { userId });
    const result = await this.authService.changePassword(userId, dto);
    this.logger.success('Password changed successfully', 'AuthController', { userId });
    return result;
  }
}
