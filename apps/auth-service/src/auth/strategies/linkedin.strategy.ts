import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-linkedin-oauth2';

@Injectable()
export class LinkedInStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('app.linkedin.clientId'),
      clientSecret: configService.get<string>('app.linkedin.clientSecret'),
      callbackURL: configService.get<string>('app.linkedin.callbackUrl'),
      scope: ['r_emailaddress', 'r_liteprofile'],
    });
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
