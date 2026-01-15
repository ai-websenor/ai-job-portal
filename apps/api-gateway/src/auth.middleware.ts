import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: FastifyRequest, res: FastifyReply, next: () => void) {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET!, // ✅ ALWAYS verify, not decode
        ) as any;

        // Normalize user id
        if (!decoded.id && decoded.sub) {
          decoded.id = decoded.sub;
        }

        // Fix: req might be IncomingMessage (no .raw) or FastifyRequest (has .raw)
        const rawReq = (req as any).raw || req;
        (rawReq as any).user = decoded;
      } catch {
        const rawReq = (req as any).raw || req;
        (rawReq as any).user = null;
      }
    } else {
      const rawReq = (req as any).raw || req;
      (rawReq as any).user = null;
    }

    next();
  }
}
