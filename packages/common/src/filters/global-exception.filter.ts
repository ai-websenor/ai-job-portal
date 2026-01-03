
import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'string') {
                message = exceptionResponse;
            } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
                // Handle standard NestJS error objects or custom objects
                message = (exceptionResponse as any).message || (exceptionResponse as any).error || message;
                // If message is an array (class-validator), join them
                if (Array.isArray(message)) {
                    message = message.join(', ');
                }
            }
        } else if (exception instanceof Error) {
            message = exception.message;
        }

        // Determine the response object based on the adapter (Fastify or Express)
        // NestJS Fastify adapter uses `response.send()`
        // Standard Express uses `response.status().json()`

        // We can use a generic approach if possible, but 'response.status' is common 
        // However, fastify might need direct access.
        // Let's check if 'status' function exists (Express style) or we assign property (Fastify might work differently wrapped).
        // Actually, NestJS Gives us a wrapper for strict MVC. But often standard response object.

        // Safe way for NestJS + Fastify:
        const errorResponse = {
            data: null,
            message: message,
            status: 'error',
            statusCode: status,
        };

        if (response.status && typeof response.status === 'function') {
            response.status(status).send(errorResponse);
        } else {
            // Fallback or specific Fastify handling if strict
            if (response.code) { // fastify
                response.code(status).send(errorResponse);
            } else {
                response.statusCode = status;
                response.send(errorResponse); // express-like but basic
            }
        }
    }
}
