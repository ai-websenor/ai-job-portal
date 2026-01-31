/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, Req, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OAuthService, SocialProfile } from './oauth.service';
import { Public } from '@ai-job-portal/common';

@ApiTags('oauth')
@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiQuery({ name: 'role', enum: ['candidate', 'employer'], required: false })
  googleLogin(@Query('role') role?: string) {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Returns auth tokens' })
  async googleCallback(@Req() req: any) {
    const profile: SocialProfile = {
      provider: 'google',
      providerId: req.user.providerId,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      avatarUrl: req.user.avatarUrl,
    };

    const role = req.query.state ? JSON.parse(req.query.state).role : 'candidate';
    return this.oauthService.handleSocialLogin(profile, role);
  }

  // LinkedIn OAuth endpoints can be added similarly
}
