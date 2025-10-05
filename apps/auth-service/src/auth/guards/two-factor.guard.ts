import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestUser } from '../../common/interfaces/auth-user.interface';

export const SKIP_TWO_FACTOR_KEY = 'skipTwoFactor';

@Injectable()
export class TwoFactorGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipTwoFactor = this.reflector.getAllAndOverride<boolean>(
      SKIP_TWO_FACTOR_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTwoFactor) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // If 2FA is enabled but not verified in this session
    if (user.twoFactorEnabled && !request['twoFactorVerified']) {
      throw new UnauthorizedException('Two-factor authentication required');
    }

    return true;
  }
}
