import { JwtPayload } from '@/jwt/interface/jwt.payload';
import { decryptAES, encryptAES } from '@/utils/crypto.util';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtServiceCustom {
  private readonly logger = new Logger(JwtServiceCustom.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateAccessToken(payload: JwtPayload): string {
    try {
      const encryptedPayload = encryptAES(payload);

      return this.jwtService.sign(
        { encrypted: encryptedPayload },
        {
          secret: this.configService.get<string>('jwt.secret'),
          expiresIn: this.configService.get<string>('jwt.expiresIn'),
        },
      );
    } catch (error) {
      this.logger.error('Error generating access token', error.stack);
      throw error;
    }
  }

  generateRefreshToken(payload: JwtPayload): string {
    try {
      const encryptedPayload = encryptAES(payload);

      return this.jwtService.sign(
        { encrypted: encryptedPayload },
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
          expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
        },
      );
    } catch (error) {
      this.logger.error('Error generating refresh token', error.stack);
      throw error;
    }
  }

  verifyAccessToken(token: string): JwtPayload | null {
    try {
      const decoded = this.jwtService.verify<{ encrypted: string }>(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      return decryptAES(decoded.encrypted);
    } catch (error) {
      this.logger.warn('Invalid access token', { token, error: error.message });
      return null;
    }
  }

  verifyRefreshToken(token: string): JwtPayload | null {
    try {
      const decoded = this.jwtService.verify<{ encrypted: string }>(token, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      return decryptAES(decoded.encrypted);
    } catch (error) {
      this.logger.warn('Invalid refresh token', {
        token,
        error: error.message,
      });
      return null;
    }
  }

  decodeToken(token: string): any {
    try {
      const decoded = this.jwtService.decode<{ encrypted: string }>(token);
      if (!decoded || typeof decoded !== 'object' || !decoded.encrypted)
        return null;

      return decryptAES(decoded.encrypted);
    } catch (error) {
      this.logger.error('Error decoding token', error.stack);
      return null;
    }
  }
}
