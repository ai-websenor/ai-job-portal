import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(private readonly jwtService: JwtService) {}

  async use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    this.logger.log(`🚀 AuthMiddleware CALLED for: ${req.method} ${req.url}`);

    const authHeader = req.headers.authorization;

    this.logger.log(`🔐 Authorization header: ${authHeader ? 'Present' : 'Missing'}`);

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const payload = this.jwtService.verify(token);
        (req as any).user = payload;
        this.logger.log(`✅ JWT verified, user: ${JSON.stringify(payload)}`);
      } catch (error) {
        this.logger.error(`❌ JWT verification failed: ${error.message}`);
        // Token invalid/expired - continue without user
        // Protected routes will handle 401
      }
    } else {
      this.logger.warn('⚠️  No Bearer token found');
    }

    next();
  }
}
