import { Injectable, UnauthorizedException, Logger, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DATABASE_CONNECTION } from '../../database/database.module';
import * as schema from '@ai-job-portal/database';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        configService: ConfigService,
        @Inject(DATABASE_CONNECTION) private readonly db: PostgresJsDatabase<typeof schema>,
    ) {
        // Fallback to the same default as AuthService if env var is missing
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
            console.warn('[JwtStrategy] WARNING: JWT_SECRET is not set in environment variables. Using fallback default.');
        }
        const effectiveSecret = secret || 'change-this-secret-in-production';
        console.log(`[JwtStrategy] Initializing with secret (first 5 chars): ${effectiveSecret.substring(0, 5)}...`);

        super({
            jwtFromRequest: (req) => {
                const authHeader = req.headers?.authorization;
                console.log(`[JwtStrategy] Raw Auth Header: '${authHeader}'`); // Temporary debug log

                if (!authHeader) {
                    console.log('[JwtStrategy] No authorization header found'); // Temporary debug log
                    return null;
                }

                // Defensive check for malformed "Bearer Bearer" header
                if (authHeader.match(/^\s*Bearer\s+Bearer\s+/i)) {
                    console.warn('[JwtStrategy] Malformed Authorization header detected (Double Bearer). Rejecting request.');
                    throw new UnauthorizedException('Malformed Authorization header. Format must be "Bearer <token>"');
                }

                // Regex to match one or more "Bearer " prefixes (case insensitive) at the start
                // and replace them with empty string, effectively extracting the token
                const token = authHeader.replace(/^(\s*Bearer\s+)+/i, '').trim();
                console.log(`[JwtStrategy] Extracted Token (first 20 chars): ${token.substring(0, 20)}...`); // Temporary debug log
                return token;
            },
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: any) {
        console.log(`[JwtStrategy] Validating payload:`, JSON.stringify(payload)); // Temporary debug log

        if (!payload) {
            this.logger.error('Payload is null or undefined');
            throw new UnauthorizedException();
        }

        const user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role
        };
        console.log(`[JwtStrategy] User validated:`, JSON.stringify(user)); // Temporary debug log
        return user;
    }
}
