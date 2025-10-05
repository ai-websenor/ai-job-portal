import { UserRole } from '@ai-job-portal/common';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface EmailVerificationPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface PasswordResetPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}
