import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-linkedin-oauth2';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  private readonly logger = new Logger(LinkedInStrategy.name);

  constructor(configService: ConfigService) {
    const clientId = configService.get<string>('app.linkedin.clientId');
    const clientSecret = configService.get<string>('app.linkedin.clientSecret');
    const isEnabled = !!(clientId && clientSecret);

    super({
      clientID: clientId || 'placeholder-not-configured',
      clientSecret: clientSecret || 'placeholder-not-configured',
      callbackURL: configService.get<string>('app.linkedin.callbackUrl') || 'http://localhost:3001/auth/linkedin/callback',
      scope: ['r_emailaddress', 'r_liteprofile'],
    });

    if (!isEnabled) {
      this.logger.warn('LinkedIn OAuth credentials not configured. LinkedIn authentication will be disabled.');
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: Function,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const user = {
      provider: 'linkedin',
      providerId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      photo: photos[0],
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
