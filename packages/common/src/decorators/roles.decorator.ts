import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type UserRole =
  | 'candidate'
  | 'employer'
  | 'super_employer'
  | 'admin'
  | 'team_member'
  | 'super_admin';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
