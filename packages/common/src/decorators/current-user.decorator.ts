import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId?: string | null; // Company ID for admin/employer users (null for others)
  iat?: number;
  exp?: number;
}

export const CurrentUser = createParamDecorator(
  (
    data: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | string | number | undefined | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload | null;

    if (data && user) {
      return user[data];
    }
    return user;
  },
);
