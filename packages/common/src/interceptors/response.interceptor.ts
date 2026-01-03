
import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
    data: T;
    message: string;
    status: string;
    statusCode: number;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {
        return next.handle().pipe(
            map((res: any) => {
                // Default values
                let message = 'Operation successful';
                let statusCode = 200;
                let status = 'success';
                let data = res;

                // If response is an object, check for overrides
                if (res && typeof res === 'object' && !Array.isArray(res)) {
                    if (res.message) {
                        message = res.message;
                    }

                    // Handle statusCode mapping
                    if (res.statusCode) {
                        statusCode = res.statusCode;
                    } else if (res.status && typeof res.status === 'number') {
                        statusCode = res.status;
                    }

                    // Handle status string
                    if (res.status && typeof res.status === 'string') {
                        status = res.status;
                    } else if (statusCode >= 400) {
                        status = 'error';
                    }

                    // If 'data' property exists, use it as the payload
                    if ('data' in res) {
                        data = res.data;
                    } else {
                        // Otherwise, clean the object from metadata fields to form the data
                        const { message: _m, statusCode: _sc, status: _s, ...rest } = res;
                        data = rest;
                    }
                }

                // Dynamically set the HTTP status code of the response
                const response = context.switchToHttp().getResponse();
                if (response.status && typeof response.status === 'function') {
                    response.status(statusCode);
                } else if (response.code) { // fastify
                    response.code(statusCode);
                }

                return {
                    data: data || {}, // ensure data is not null/undefined for success
                    message,
                    status,
                    statusCode,
                };
            }),
        );
    }
}
