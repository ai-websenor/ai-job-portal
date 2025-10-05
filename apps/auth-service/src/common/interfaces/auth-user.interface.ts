import { UserRole } from '@ai-job-portal/common';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  twoFactorEnabled?: boolean;
}

export interface RequestUser extends AuthUser {
  sessionId?: string;
}
