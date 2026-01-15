'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== 'default' && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.ApiSuccessResponse =
  exports.UserAgent =
  exports.IpAddress =
  exports.CompanyId =
  exports.GetUserRole =
  exports.UserId =
  exports.CurrentUser =
    void 0;
const common_1 = require('@nestjs/common');
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
exports.UserId = (0, common_1.createParamDecorator)((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.id;
});
exports.GetUserRole = (0, common_1.createParamDecorator)((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.role;
});
exports.CompanyId = (0, common_1.createParamDecorator)((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user?.companyId;
});
exports.IpAddress = (0, common_1.createParamDecorator)((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  return request.ip || request.connection.remoteAddress;
});
exports.UserAgent = (0, common_1.createParamDecorator)((data, ctx) => {
  const request = ctx.switchToHttp().getRequest();
  return request.headers['user-agent'];
});
const ApiSuccessResponse = (message) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args) {
      const result = await originalMethod.apply(this, args);
      return {
        success: true,
        message,
        data: result,
      };
    };
    return descriptor;
  };
};
exports.ApiSuccessResponse = ApiSuccessResponse;
__exportStar(require('./role.decorator'), exports);
__exportStar(require('./permissions.decorator'), exports);
__exportStar(require('./subscription.decorator'), exports);
__exportStar(require('./public.decorator'), exports);
__exportStar(require('./rate-limit.decorator'), exports);
__exportStar(require('./validation.decorator'), exports);
__exportStar(require('./cache.decorator'), exports);
__exportStar(require('./audit.decorator'), exports);
//# sourceMappingURL=index.js.map
