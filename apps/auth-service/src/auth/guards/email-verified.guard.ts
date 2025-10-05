import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestUser } from '../../common/interfaces/auth-user.interface';

export const SKIP_EMAIL_VERIFICATION_KEY = 'skipEmailVerification';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipEmailVerification = this.reflector.getAllAndOverride<boolean>(
      SKIP_EMAIL_VERIFICATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipEmailVerification) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.isVerified) {
      throw new ForbiddenException('Email not verified. Please verify your email to continue.');
    }

    return true;
  }
}
