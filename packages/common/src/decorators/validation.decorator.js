"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sort = exports.QueryFilters = exports.Pagination = void 0;
const common_1 = require("@nestjs/common");
exports.Pagination = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 20;
    const skip = (page - 1) * limit;
    return {
        page,
        limit,
        skip,
    };
});
exports.QueryFilters = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const { page, limit, sort, order, ...filters } = request.query;
    return filters;
});
exports.Sort = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    const sortField = request.query.sort || 'createdAt';
    const sortOrder = request.query.order === 'asc' ? 'ASC' : 'DESC';
    return {
        field: sortField,
        order: sortOrder,
    };
});
//# sourceMappingURL=validation.decorator.js.map