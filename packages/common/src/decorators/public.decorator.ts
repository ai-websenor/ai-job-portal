import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Public decorator - Mark endpoint as publicly accessible (skip authentication)
 * @example @Public()
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const SKIP_AUTH_KEY = 'skipAuth';

/**
 * Skip Auth decorator - Skip authentication for this endpoint
 * @example @SkipAuth()
 */
export const SkipAuth = () => SetMetadata(SKIP_AUTH_KEY, true);
