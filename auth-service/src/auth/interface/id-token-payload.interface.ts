export interface IdTokenPayload {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  email_verified?: boolean;
  [key: string]: any; // Cho phép các trường tùy chỉnh khác
}
