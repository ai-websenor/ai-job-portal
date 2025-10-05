import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtRefreshPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserService } from '../../user/services/user.service';
import { SessionService } from '../../session/services/session.service';
import { RequestUser } from '../../common/interfaces/auth-user.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwt.secret'),
    });
  }

  async validate(payload: JwtRefreshPayload): Promise<RequestUser> {
    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify session exists and is valid
    const session = await this.sessionService.findByRefreshToken(payload.sessionId);

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    if (!this.sessionService.isSessionValid(session)) {
      throw new UnauthorizedException('Session expired');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      sessionId: session.id,
    };
  }
}
