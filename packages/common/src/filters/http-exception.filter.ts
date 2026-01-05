import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CustomLogger } from '@ai-job-portal/logger';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new CustomLogger();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const isHttpException = exception instanceof HttpException;

    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : 'Internal server error';

    const user = (request.raw as any)?.user;

    // ✅ Log everything useful
    this.logger.error(
      request.url,
      exception instanceof Error ? exception : new Error(String(exception)),
      'HttpExceptionFilter',
      {
        statusCode: status,
        requestId: request.id,
        userId: user?.id,
        email: user?.email,
        role: user?.role,
        ip: request.ip,
        params: Object.keys(request.params || {}).length
          ? JSON.stringify(request.params)
          : undefined,
        query: Object.keys(request.query || {}).length ? JSON.stringify(request.query) : undefined,
        body: request.method !== 'GET' ? JSON.stringify(request.body) : undefined,
        error: JSON.stringify(exceptionResponse),
      },
    );

    // ✅ Standard API error response
    response.status(status).send({
      success: false,
      statusCode: status,
      message: this.getMessage(exceptionResponse),
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV !== 'production' && !isHttpException
        ? { stack: (exception as Error).stack }
        : {}),
    });
  }

  private getMessage(exceptionResponse: any): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (typeof exceptionResponse === 'object') {
      if (Array.isArray(exceptionResponse.message)) {
        return exceptionResponse.message.join(', ');
      }

      return exceptionResponse.message || 'Request failed';
    }

    return 'Unexpected error';
  }
}
