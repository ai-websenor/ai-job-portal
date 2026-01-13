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
exports.ResponseInterceptor = void 0;
const common_1 = require('@nestjs/common');
const operators_1 = require('rxjs/operators');
let ResponseInterceptor = class ResponseInterceptor {
  intercept(context, next) {
    return next.handle().pipe(
      (0, operators_1.map)((res) => {
        let message = 'Operation successful';
        let statusCode = 200;
        let status = 'success';
        let data = res;
        if (res && typeof res === 'object' && !Array.isArray(res)) {
          if (res.message) {
            message = res.message;
          }
          if (res.statusCode) {
            statusCode = res.statusCode;
          } else if (res.status && typeof res.status === 'number') {
            statusCode = res.status;
          }
          if (res.status && typeof res.status === 'string') {
            status = res.status;
          } else if (statusCode >= 400) {
            status = 'error';
          }
          if ('data' in res) {
            data = res.data;
          } else {
            const { message: _m, statusCode: _sc, status: _s, ...rest } = res;
            data = rest;
          }
        }
        const response = context.switchToHttp().getResponse();
        if (response.status && typeof response.status === 'function') {
          response.status(statusCode);
        } else if (response.code) {
          response.code(statusCode);
        }
        return {
          data: data || {},
          message,
          status,
          statusCode,
        };
      }),
    );
  }
};
exports.ResponseInterceptor = ResponseInterceptor;
exports.ResponseInterceptor = ResponseInterceptor = __decorate(
  [(0, common_1.Injectable)()],
  ResponseInterceptor,
);
//# sourceMappingURL=response.interceptor.js.map
