import { Roles } from '@/app/types/enum';

export const isEmployerRole = (role?: string | null) =>
  role === Roles.employer || role === Roles.super_employer;

