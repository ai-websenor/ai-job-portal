/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '@ai-job-portal/database';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    @Inject(DATABASE_CONNECTION)
    private readonly db: PostgresJsDatabase<typeof schema>,
  ) {
    // Fallback to the same default as AuthService if env var is missing
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      console.warn(
        '[JwtStrategy] WARNING: JWT_SECRET is not set in environment variables. Using fallback default.',
      );
    }

    super({
      jwtFromRequest: (req) =>
        req.headers?.authorization?.split(' ')[1] ?? null,
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: any) {
    if (!payload) {
      this.logger.error('Payload is null or undefined');
      throw new UnauthorizedException();
    }

    const user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return user;
  }
}
