import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const clientId = configService.get<string>('app.google.clientId');
    const clientSecret = configService.get<string>('app.google.clientSecret');
    const isEnabled = !!(clientId && clientSecret);

    super({
      clientID: clientId || 'placeholder-not-configured',
      clientSecret: clientSecret || 'placeholder-not-configured',
      callbackURL: configService.get<string>('app.google.callbackUrl') || 'http://localhost:3001/auth/google/callback',
      scope: ['email', 'profile'],
    });

    this.isEnabled = isEnabled;
    if (!isEnabled) {
      this.logger.warn('Google OAuth credentials not configured. Google authentication will be disabled.');
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const user = {
      provider: 'google',
      providerId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      photo: photos[0].value,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
