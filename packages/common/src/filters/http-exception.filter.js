'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require('@nestjs/common');
const logger_1 = require('@ai-job-portal/logger');
let HttpExceptionFilter = class HttpExceptionFilter {
  constructor() {
    this.logger = new logger_1.CustomLogger();
  }
  catch(exception, host) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const isHttpException =
      exception instanceof common_1.HttpException ||
      (typeof exception === 'object' &&
        exception !== null &&
        'getStatus' in exception &&
        typeof exception.getStatus === 'function');
    console.log('🔍 Exception Debug:', {
      type: exception?.constructor?.name,
      isHttpException,
      hasGetStatus: typeof exception === 'object' && exception !== null && 'getStatus' in exception,
    });
    const status = isHttpException
      ? exception.getStatus()
      : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : 'Internal server error';
    console.log('📊 Status & Response:', { status, exceptionResponse });
    const user = request.raw?.user;
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
    response.status(status).send({
      data: null,
      message: this.getMessage(exceptionResponse),
      status: 'error',
      statusCode: status,
    });
  }
  getMessage(exceptionResponse) {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }
    if (typeof exceptionResponse === 'object') {
      if (Array.isArray(exceptionResponse.message)) {
        return exceptionResponse.message;
      }
      return exceptionResponse.message || 'Request failed';
    }
    return 'Unexpected error';
  }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate(
  [(0, common_1.Catch)()],
  HttpExceptionFilter,
);
//# sourceMappingURL=http-exception.filter.js.map
