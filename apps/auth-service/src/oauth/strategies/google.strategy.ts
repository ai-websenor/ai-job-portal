import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private readonly configService: ConfigService) {
    const isProduction = configService.get('NODE_ENV') === 'production';
    const clientID = configService.get('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get('GOOGLE_CALLBACK_URL');

    // Validate required config in production
    if (isProduction) {
      if (!clientID || !clientSecret) {
        throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in production');
      }
      if (!callbackURL) {
        throw new Error('GOOGLE_CALLBACK_URL is required in production');
      }
    }

    super({
      clientID: clientID || 'google-client-id',
      clientSecret: clientSecret || 'google-client-secret',
      callbackURL: callbackURL || 'http://localhost:3001/api/v1/oauth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });

    if (!isProduction && (!clientID || !clientSecret)) {
      this.logger.warn('Using placeholder Google OAuth credentials - OAuth will not work');
    }
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, name, photos } = profile;

    const user = {
      providerId: id,
      email: emails[0].value,
      firstName: name?.givenName,
      lastName: name?.familyName,
      avatarUrl: photos?.[0]?.value,
      accessToken,
    };

    done(null, user);
  }
}
