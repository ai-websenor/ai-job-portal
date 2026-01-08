import {ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus} from '@nestjs/common';
import {FastifyReply, FastifyRequest} from 'fastify';
import {CustomLogger} from '@ai-job-portal/logger';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new CustomLogger();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    // Check if exception has getStatus method (more reliable than instanceof)
    const isHttpException =
      exception instanceof HttpException ||
      (typeof exception === 'object' &&
        exception !== null &&
        'getStatus' in exception &&
        typeof (exception as any).getStatus === 'function');

    console.log('🔍 Exception Debug:', {
      type: exception?.constructor?.name,
      isHttpException,
      hasGetStatus: typeof exception === 'object' && exception !== null && 'getStatus' in exception,
    });

    const status = isHttpException
      ? (exception as HttpException).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException
      ? (exception as HttpException).getResponse()
      : 'Internal server error';

    console.log('📊 Status & Response:', {status, exceptionResponse});

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

    // ✅ Standard API error response - matches ResponseInterceptor format
    response.status(status).send({
      data: null,
      message: this.getMessage(exceptionResponse),
      status: 'error',
      statusCode: status,
    });
  }

  private getMessage(exceptionResponse: any): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (typeof exceptionResponse === 'object') {
      // Return validation errors as array for better frontend handling
      if (Array.isArray(exceptionResponse.message)) {
        return exceptionResponse.message;
      }

      return exceptionResponse.message || 'Request failed';
    }

    return 'Unexpected error';
  }
}
