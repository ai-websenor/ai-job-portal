import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { RequestUser } from '../interfaces/auth-user.interface';

export const GetUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext): RequestUser | any => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    const user = request['user'] as RequestUser;

    return data ? user?.[data] : user;
  },
);
