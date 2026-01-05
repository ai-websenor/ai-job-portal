import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGrpcClient } from '../../grpc/auth-grpc.client';
import { CustomLogger } from '@ai-job-portal/logger';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new CustomLogger();

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

    // Handle potential double Bearer prefix or standard Bearer prefix by taking the last part
    const parts = authHeader.split(' ');
    const token = parts[parts.length - 1];

    if (!token) {
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
      this.logger.error('Token validation error:', error as Error, 'JwtAuthGuard');
      throw new UnauthorizedException('Failed to validate token');
    }
  }
}
