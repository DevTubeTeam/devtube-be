import { JwtPayload } from '@/jwt/interface/jwt.payload';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface AuthLoginResponse {
  tokens: AuthTokens;
  user: AuthenticatedUser;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface ValidateTokenResponse {
  isValid: boolean;
  user?: JwtPayload;
}
