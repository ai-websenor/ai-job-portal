import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserService } from '../../user/services/user.service';
import { SessionService } from '../../session/services/session.service';
import { RequestUser } from '../../common/interfaces/auth-user.interface';

const logger = new Logger('JwtStrategy');

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwt.secret'),
    });

  }


  async validate(payload: JwtPayload): Promise<RequestUser> {
    // Validate session exists and is not expired
    const session = await this.sessionService.findById(payload.sessionId);

    if (!session) {
      logger.warn(`Session not found for sessionId: ${payload.sessionId}`);
      throw new UnauthorizedException('Session not found. Please login again');
    }

    // Check if session is expired
    if (!this.sessionService.isSessionValid(session)) {
      logger.warn(`Session expired for sessionId: ${payload.sessionId}, userId: ${payload.sub}`);

      // Delete expired session from database
      await this.sessionService.deleteSession(session.id);

      throw new UnauthorizedException('Session expired. Please login again');
    }

    // Validate user
    const user = await this.userService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    logger.log(`JWT validated for user: ${user.email}, sessionId: ${payload.sessionId}`);

    return {
      id: user.id,
      email: user.email,
      role: user.role as any,
      isVerified: user.isVerified,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled || false,
    };
  }
}
