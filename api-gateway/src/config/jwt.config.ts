import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  access: {
    secret: process.env.JWT_ACCESS_SECRET || 'default_access_secret', // Add fallback
    expiresIn: process.env.JWT_EXPIRATION || '3600s', // Add fallback
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET || 'default_refresh_secret', // Add fallback
    expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d', // Add fallback
  },
}));
