import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(configService: ConfigService) {
        // Fallback to the same default as AuthService if env var is missing
        const secret = configService.get<string>('JWT_SECRET') || 'change-this-secret-in-production';
        console.log(`[JwtStrategy] Initializing with secret (first 5 chars): ${secret ? secret.substring(0, 5) : 'UNDEFINED'}...`);

        super({
            jwtFromRequest: (req) => {
                const authHeader = req.headers?.authorization;
                console.log(`[JwtStrategy] Raw Auth Header: '${authHeader}'`);

                if (!authHeader) {
                    console.log('[JwtStrategy] No authorization header found');
                    return null;
                }

                // Regex to match one or more "Bearer " prefixes (case insensitive) at the start
                // and replace them with empty string, effectively extracting the token
                const token = authHeader.replace(/^(\s*Bearer\s+)+/i, '').trim();
                console.log(`[JwtStrategy] Extracted Token (first 20 chars): ${token.substring(0, 20)}...`);
                return token;
            },
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    async validate(payload: any) {
        console.log(`[JwtStrategy] Validating payload:`, JSON.stringify(payload));

        if (!payload) {
            this.logger.error('Payload is null or undefined');
            throw new UnauthorizedException();
        }

        const user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role
        };
        console.log(`[JwtStrategy] User validated:`, JSON.stringify(user));
        return user;
    }
}
