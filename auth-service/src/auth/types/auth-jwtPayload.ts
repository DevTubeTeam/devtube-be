export interface AuthJwtPayload {
  sub: string; // User ID
  email: string; // Email của người dùng
  jti: string; // JWT ID (để kiểm tra token bị thu hồi)
  iat?: number; // Thời gian phát hành token (Issued At)
  exp?: number; // Thời gian hết hạn token (Expiration Time)
}
