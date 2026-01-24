export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  isVerified: boolean;
  isMobileVerified: boolean;
  onboardingStep: number;
  isOnboardingCompleted: boolean;
}
