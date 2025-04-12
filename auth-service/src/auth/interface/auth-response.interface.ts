import { JwtPayload } from '@/jwt/interface/jwt.payload';

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface IAuthLoginResponse {
  tokens: IAuthTokens;
  user: IAuthenticatedUser;
}

export interface IRefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ILogoutResponse {
  success: boolean;
  message: string;
}

export interface IValidateTokenResponse {
  isValid: boolean;
  user?: JwtPayload;
}

export interface IExchangeCodeForTokenResponse {
  accessToken: string;
  idToken: string;
}
