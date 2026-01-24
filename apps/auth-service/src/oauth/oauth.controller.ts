import { Controller, Get, Query, Res, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { FastifyReply } from 'fastify';
import { CognitoService } from '@ai-job-portal/aws';
import { Public } from '@ai-job-portal/common';
import { OAuthService } from './oauth.service';

@ApiTags('oauth')
@Controller('oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly oauthService: OAuthService,
    private readonly cognitoService: CognitoService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
  }

  @Get('google')
  @Public()
  @ApiOperation({ summary: 'Initiate Google OAuth login via Cognito' })
  @ApiQuery({ name: 'role', enum: ['candidate', 'employer'], required: false })
  @ApiQuery({ name: 'redirect_uri', required: false })
  googleLogin(
    @Query('role') role: string = 'candidate',
    @Query('redirect_uri') redirectUri?: string,
    @Res() res?: FastifyReply,
  ) {
    const callbackUrl = redirectUri || `${this.frontendUrl}/auth/callback`;

    // Cognito handles Google OAuth - redirect to Cognito authorization URL
    const authUrl = this.cognitoService.getAuthorizationUrl('Google', callbackUrl);

    // Append state with role for callback
    const urlWithState = `${authUrl}&state=${encodeURIComponent(JSON.stringify({ role }))}`;

    this.logger.log(`Redirecting to Google OAuth via Cognito: ${role}`);

    if (res) {
      res.redirect(urlWithState);
    } else {
      return { authorizationUrl: urlWithState };
    }
  }

  @Get('apple')
  @Public()
  @ApiOperation({ summary: 'Initiate Apple OAuth login via Cognito' })
  @ApiQuery({ name: 'role', enum: ['candidate', 'employer'], required: false })
  @ApiQuery({ name: 'redirect_uri', required: false })
  appleLogin(
    @Query('role') role: string = 'candidate',
    @Query('redirect_uri') redirectUri?: string,
    @Res() res?: FastifyReply,
  ) {
    const callbackUrl = redirectUri || `${this.frontendUrl}/auth/callback`;

    // Cognito handles Apple OAuth
    const authUrl = this.cognitoService.getAuthorizationUrl('SignInWithApple', callbackUrl);
    const urlWithState = `${authUrl}&state=${encodeURIComponent(JSON.stringify({ role }))}`;

    this.logger.log(`Redirecting to Apple OAuth via Cognito: ${role}`);

    if (res) {
      res.redirect(urlWithState);
    } else {
      return { authorizationUrl: urlWithState };
    }
  }

  @Get('callback')
  @Public()
  @ApiOperation({ summary: 'OAuth callback from Cognito' })
  @ApiResponse({ status: 200, description: 'Returns redirect URL with tokens' })
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: FastifyReply,
  ) {
    if (!code) {
      throw new BadRequestException('Authorization code missing');
    }

    try {
      // Parse state to get role
      let role: 'candidate' | 'employer' = 'candidate';
      if (state) {
        try {
          const stateData = JSON.parse(decodeURIComponent(state));
          role = stateData.role || 'candidate';
        } catch {
          this.logger.warn('Failed to parse OAuth state');
        }
      }

      // Exchange code for tokens with Cognito
      // Note: This requires implementing token exchange in CognitoService
      // For now, redirect to frontend with code for frontend to handle
      const frontendCallback = `${this.frontendUrl}/auth/callback?code=${code}&state=${state}`;

      this.logger.log(`OAuth callback - redirecting to frontend with code`);
      res.redirect(frontendCallback);
    } catch (error) {
      this.logger.error('OAuth callback error', error);
      res.redirect(`${this.frontendUrl}/auth/error?message=OAuth+failed`);
    }
  }
}
