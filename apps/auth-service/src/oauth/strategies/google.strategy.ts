import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID') || 'google-client-id',
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET') || 'google-client-secret',
      callbackURL: configService.get('GOOGLE_CALLBACK_URL') || 'http://localhost:3001/api/v1/oauth/google/callback',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
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
