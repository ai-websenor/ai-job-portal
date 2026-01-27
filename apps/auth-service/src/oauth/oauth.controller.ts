/* eslint-disable @typescript-eslint/no-unused-vars */
import { Controller, Get, Req, Res, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
import { OAuthService, SocialProfile } from './oauth.service';
import { Public } from '@ai-job-portal/common';

@ApiTags('oauth')
@Controller('oauth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @Public()
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @ApiQuery({ name: 'role', enum: ['candidate', 'employer'], required: false })
  googleLogin(@Query('role') role: string = 'candidate', @Res() res: FastifyReply) {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    const callbackUrl = this.configService.get('GOOGLE_CALLBACK_URL');

    // Encode state with role information
    const state = Buffer.from(JSON.stringify({ role })).toString('base64');

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', callbackUrl);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'email profile');
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');

    return res.redirect(302, googleAuthUrl.toString());
  }

  @Get('google/callback')
  @Public()
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Returns auth tokens' })
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Req() req: FastifyRequest,
  ) {
    if (error) {
      throw new Error(`Google OAuth error: ${error}`);
    }

    if (!code) {
      throw new Error('No authorization code received from Google');
    }

    // Decode state to get role
    let role = 'candidate';
    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
        role = decoded.role || 'candidate';
      } catch {
        // Ignore parse errors, use default role
      }
    }

    // Exchange code for tokens
    const tokenResponse = await this.exchangeCodeForTokens(code);

    // Get user profile from Google
    const userProfile = await this.getGoogleUserProfile(tokenResponse.access_token);

    const profile: SocialProfile = {
      provider: 'google',
      providerId: userProfile.id,
      email: userProfile.email,
      firstName: userProfile.given_name,
      lastName: userProfile.family_name,
      avatarUrl: userProfile.picture,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
    };

    return this.oauthService.handleSocialLogin(profile, role as 'candidate' | 'employer');
  }

  private async exchangeCodeForTokens(code: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }> {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
    const callbackUrl = this.configService.get('GOOGLE_CALLBACK_URL');

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }

    return response.json();
  }

  private async getGoogleUserProfile(accessToken: string): Promise<{
    id: string;
    email: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
  }> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user profile: ${error}`);
    }

    return response.json();
  }
}
