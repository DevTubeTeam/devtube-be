interface JwtPayload {
  sub: string;
  email?: string;
  role?: 'user' | 'admin';
  jti: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export { JwtPayload };
