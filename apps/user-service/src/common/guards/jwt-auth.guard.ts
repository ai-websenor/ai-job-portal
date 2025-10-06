import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGrpcClient } from '../../grpc/auth-grpc.client';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private authGrpcClient: AuthGrpcClient,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    try {
      const validationResponse = await this.authGrpcClient.validateToken(token);

      if (!validationResponse.valid) {
        throw new UnauthorizedException(validationResponse.message || 'Invalid token');
      }

      // Attach user info to request
      request.user = {
        id: validationResponse.userId,
        email: validationResponse.email,
        role: validationResponse.role,
      };

      return true;
    } catch (error) {
      this.logger.error('Token validation error:', error);
      throw new UnauthorizedException('Failed to validate token');
    }
  }
}
