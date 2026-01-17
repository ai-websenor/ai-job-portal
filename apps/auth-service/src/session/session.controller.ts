import { Controller, Get, Delete, Param, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '@ai-job-portal/common';
import { SessionService } from './session.service';
import { SessionResponseDto, SocialLoginResponseDto } from './dto';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('users/me')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  // Session endpoints
  @Get('sessions')
  @ApiOperation({ summary: 'Get all active sessions' })
  @ApiResponse({ status: 200, description: 'List of active sessions', type: [SessionResponseDto] })
  async getSessions(
    @CurrentUser('sub') userId: string,
    @Headers('authorization') auth: string,
  ) {
    const token = auth?.replace('Bearer ', '');
    return this.sessionService.getUserSessions(userId, token);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Terminate a specific session' })
  @ApiParam({ name: 'id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Session terminated' })
  async deleteSession(
    @CurrentUser('sub') userId: string,
    @Param('id') sessionId: string,
    @Headers('authorization') auth: string,
  ) {
    const token = auth?.replace('Bearer ', '');
    return this.sessionService.deleteSession(userId, sessionId, token);
  }

  @Delete('sessions')
  @ApiOperation({ summary: 'Terminate all sessions except current (logout all devices)' })
  @ApiResponse({ status: 200, description: 'All other sessions terminated' })
  async deleteAllSessions(
    @CurrentUser('sub') userId: string,
    @Headers('authorization') auth: string,
  ) {
    const token = auth?.replace('Bearer ', '');
    return this.sessionService.deleteAllSessions(userId, token);
  }

  // Social login endpoints
  @Get('social-logins')
  @ApiOperation({ summary: 'Get connected social accounts' })
  @ApiResponse({ status: 200, description: 'List of connected social accounts', type: [SocialLoginResponseDto] })
  async getSocialLogins(@CurrentUser('sub') userId: string) {
    return this.sessionService.getSocialLogins(userId);
  }

  @Delete('social-logins/:provider')
  @ApiOperation({ summary: 'Disconnect a social account' })
  @ApiParam({ name: 'provider', description: 'Provider name (google, linkedin)' })
  @ApiResponse({ status: 200, description: 'Social account disconnected' })
  async disconnectSocialLogin(
    @CurrentUser('sub') userId: string,
    @Param('provider') provider: string,
  ) {
    return this.sessionService.disconnectSocialLogin(userId, provider);
  }
}
