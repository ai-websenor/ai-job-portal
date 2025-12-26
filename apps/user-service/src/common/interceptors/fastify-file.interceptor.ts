import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { FastifyRequest } from 'fastify';

export function FastifyFileInterceptor(fieldName: string) {
  @Injectable()
  class MixinInterceptor implements NestInterceptor {
    public readonly logger = new Logger('FastifyFileInterceptor');

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
      const request = context.switchToHttp().getRequest<FastifyRequest & { file?: any }>();
      const contentType = request.headers['content-type'];
      const isMultipart = (request as any).isMultipart ? (request as any).isMultipart() : 'Method not found';
      
      

      try {
        const data = await (request as any).file();
        

        if (!data) {
          throw new BadRequestException(`No file uploaded. Content-Type: ${contentType}, isMultipart: ${isMultipart}`);
        }

        const buffer = await data.toBuffer();

        // Attach file to request
        (request as any).file = {
          buffer,
          originalname: data.filename,
          mimetype: data.mimetype,
          size: buffer.length,
        };

        // Attach other fields to body
        const fields = data.fields;
        (request as any).body = {};
        for (const [key, value] of Object.entries(fields)) {
          (request as any).body[key] = (value as any).value;
        }

      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Failed to process file upload');
      }

      return next.handle();
    }
  }

  return MixinInterceptor;
}
