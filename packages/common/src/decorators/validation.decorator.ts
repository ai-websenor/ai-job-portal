import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Pagination decorator - Extract pagination params from query
 */
export const Pagination = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const page = parseInt(request.query.page) || 1;
    const limit = parseInt(request.query.limit) || 20;
    const skip = (page - 1) * limit;

    return {
      page,
      limit,
      skip,
    };
  },
);

/**
 * Query Filters decorator - Extract filter params from query
 */
export const QueryFilters = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const { page, limit, sort, order, ...filters } = request.query;
    return filters;
  },
);

/**
 * Sort decorator - Extract sort params from query
 */
export const Sort = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const sortField = request.query.sort || 'createdAt';
    const sortOrder = request.query.order === 'asc' ? 'ASC' : 'DESC';

    return {
      field: sortField,
      order: sortOrder,
    };
  },
);
