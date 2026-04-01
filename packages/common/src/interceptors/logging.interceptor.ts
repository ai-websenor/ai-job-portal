import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

const SLOW_REQUEST_MS = 3000;

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const userId = request.headers['x-user-id'] || request.user?.sub || '-';
    const contentLength = request.headers['content-length'] || 0;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const duration = Date.now() - startTime;
        const slow = duration > SLOW_REQUEST_MS ? ' [SLOW]' : '';

        this.logger.log(
          `${method} ${url} ${statusCode} ${duration}ms${slow} user=${userId} ip=${ip} bytes=${contentLength}`,
        );
      }),
      catchError((err) => {
        const duration = Date.now() - startTime;
        const status = err?.status || err?.getStatus?.() || 500;

        this.logger.error(
          `${method} ${url} ${status} ${duration}ms user=${userId} ip=${ip} error=${err.message || 'Unknown'}`,
        );

        return throwError(() => err);
      }),
    );
  }
}
