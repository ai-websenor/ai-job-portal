import { UserRole, SocialProvider } from './enums';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

export interface SocialAuthPayload {
  provider: SocialProvider;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface OtpVerification {
  userId: string;
  otp: string;
  type: 'email' | 'phone' | 'password_reset' | 'two_factor';
  expiresAt: Date;
}

export interface PasswordReset {
  email: string;
  token: string;
  newPassword: string;
}

export interface TwoFactorSetup {
  userId: string;
  secret: string;
  qrCodeUrl: string;
}

export interface Session {
  id: string;
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  createdAt: Date;
}
