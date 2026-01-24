import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';

export interface CognitoJwtPayload {
  sub: string; // Cognito user sub
  email: string;
  'cognito:username': string;
  email_verified: boolean;
  iss: string;
  'cognito:groups'?: string[];
  token_use: 'access' | 'id';
  auth_time: number;
  exp: number;
  iat: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  private readonly useCognito: boolean;

  constructor(private readonly configService: ConfigService) {
    const userPoolId = configService.get('COGNITO_USER_POOL_ID');
    const region = configService.get('AWS_REGION') || 'ap-south-1';
    const useCognito = !!userPoolId;

    // Configure based on whether Cognito is available
    if (useCognito) {
      // Cognito JWKS validation
      const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKeyProvider: passportJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: `${issuer}/.well-known/jwks.json`,
        }),
        issuer,
        algorithms: ['RS256'],
      });
    } else {
      // Fallback to custom JWT (for local development without Cognito)
      super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: configService.get('JWT_SECRET') || 'dev-secret-change-in-production',
      });
    }

    this.useCognito = useCognito;
  }

  async validate(payload: CognitoJwtPayload | JwtPayload): Promise<JwtPayload> {
    if (this.useCognito) {
      // Validate Cognito token
      const cognitoPayload = payload as CognitoJwtPayload;

      if (!cognitoPayload.sub || !cognitoPayload.email) {
        this.logger.warn('Invalid Cognito token payload');
        throw new UnauthorizedException('Invalid token payload');
      }

      // Verify token_use if present (access tokens have this)
      if (cognitoPayload.token_use && cognitoPayload.token_use !== 'access') {
        this.logger.warn(`Invalid token_use: ${cognitoPayload.token_use}`);
        throw new UnauthorizedException('Invalid token type');
      }

      return {
        sub: cognitoPayload.sub,
        email: cognitoPayload.email,
        role: undefined, // Role comes from local DB, not Cognito
      };
    } else {
      // Custom JWT validation
      const jwtPayload = payload as JwtPayload;

      if (!jwtPayload.sub || !jwtPayload.email) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return {
        sub: jwtPayload.sub,
        email: jwtPayload.email,
        role: jwtPayload.role,
      };
    }
  }
}
