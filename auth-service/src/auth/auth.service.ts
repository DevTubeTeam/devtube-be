import { InvalidRefreshTokenException, TokenRevokedException } from '@/auth/exceptions';
import { TokenReusedException } from '@/auth/exceptions/token-reused.exception';
import { IAuthLoginResponse, IRefreshTokenResponse } from '@/auth/interface/auth-response.interface';
import { GoogleStrategy } from '@/auth/strategy/google.strategy';
import { JwtPayload } from '@/jwt/interface/jwt.payload';
import { JwtServiceCustom } from '@/jwt/jwt.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/utils/logger.service';
import { RabbitMQService } from '@/utils/rabbitmq.service';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtServiceCustom,
    private readonly googleStrategy: GoogleStrategy,
    private readonly logger: LoggerService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  /**
   * 1. Xử lý callback từ Google OAuth (Authorization Code Flow)
   * - Nhận code từ Google sau khi người dùng đăng nhập.
   * - Dùng GoogleStrategy để đổi code lấy access_token và id_token.
   * - Xác thực id_token để lấy thông tin người dùng.
   * - Tìm hoặc tạo mới người dùng trong database dựa trên thông tin từ Google.
   * - Tạo access_token và refresh_token nội bộ của hệ thống.
   * - Lưu hashed refresh_token vào database.
   * - Trả về access_token, refresh_token, id_token và thông tin người dùng.
   */
  async handleGoogleCallback(code: string): Promise<ServiceResponse<IAuthLoginResponse>> {
    this.logger.log('Handling Google callback', { code });

    try {
      const tokens = await this.googleStrategy.exchangeCodeForTokens(code);

      if (!tokens.id_token) {
        this.logger.error('No id_token received from Google', { tokens });
        throw new Error('No id_token received from Google');
      }

      const userInfo = await this.googleStrategy.validateIdToken(tokens.id_token);

      if (!userInfo || !userInfo.sub) {
        this.logger.error('Invalid user info from Google', { userInfo });
        throw new Error('Invalid user info received from Google');
      }

      const user = await this.prismaService.users.upsert({
        where: {
          oauth_provider_oauth_id: {
            oauth_provider: 'google',
            oauth_id: userInfo.sub,
          },
        },
        update: {
          display_name: userInfo.name,
          avatar_url: userInfo.picture,
          email_verified: userInfo.email_verified,
          last_login: new Date(),
        },
        create: {
          display_name: userInfo.name,
          email: userInfo.email,
          avatar_url: userInfo.picture,
          locale: userInfo.locale || null,
          email_verified: userInfo.email_verified,
          oauth_provider: 'google',
          oauth_id: userInfo.sub,
          metadata: JSON.parse(JSON.stringify(userInfo)),
          last_login: new Date(),
        },
      });

      const accessTokenPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        jti: randomUUID(),
        iat: Math.floor(Date.now() / 1000) - 30,
        exp: Math.floor(Date.now() / 1000) + 60 * 15,
      };

      const refreshTokenPayload: JwtPayload = {
        sub: user.id,
        jti: randomUUID(),
        iat: Math.floor(Date.now() / 1000) - 30,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      };

      const newAccessToken = this.jwtService.generateAccessToken(accessTokenPayload);
      const refreshToken = this.jwtService.generateRefreshToken(refreshTokenPayload);

      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

      await this.prismaService.users.update({
        where: { id: user.id },
        data: { hashed_refresh_token: hashedRefreshToken },
      });

      await this.rabbitMQService.publish('user_logged_in', {
        userId: user.id,
        email: user.email,
        timestamp: new Date(),
      });

      this.logger.log('User login successful', {
        userId: user.id,
        email: user.email,
      });

      return {
        statusCode: 200,
        message: 'Login successful',
        data: {
          tokens: {
            accessToken: newAccessToken,
            refreshToken,
            idToken: tokens.id_token, // Trả id_token nếu cần
          },
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            role: user.role,
          },
        },
      };
    } catch (error) {
      this.logger.error('Google callback failed', { error: error.message });
      throw error;
    }
  }

  /**
   * 2. Refresh Access Token
   * - Nhận refresh_token từ client
   * - Giải mã và xác thực chữ ký của refresh_token
   * - Trích xuất userId (sub), jti từ payload
   * - Kiểm tra xem jti này đã bị thu hồi chưa
   * - So sánh refreshToken (raw) với hashed_refresh_token bằng bcrypt.compare -> xác định token bị reuse hay chưa?
   * - Check hợp lệ:
   *    - Ghi jti cũ vào bảng revoked_tokens (revoke)
   *    - Tạo mới access_token và refresh_token (mỗi cái có jti mới)
   *    - Hash refresh_token mới và lưu vào DB
   * - Trả access_token và refresh_token mới về cho client
   */
  async refreshAccessToken(refreshToken: string): Promise<ServiceResponse<IRefreshTokenResponse>> {
    this.logger.log('Refreshing access token', {
      refreshToken: refreshToken.substring(0, 10) + '...',
    });

    try {
      const payload = this.jwtService.verifyRefreshToken(refreshToken);
      if (!payload) {
        this.logger.warn('Invalid refresh token: Cannot verify');
        throw new InvalidRefreshTokenException();
      }

      const { sub: userId, jti: oldJti } = payload;

      // Check xem jti đã bị thu hồi chưa
      if (await this.isTokenRevoked(oldJti)) {
        this.logger.warn('Refresh token has been revoked', { jti: oldJti });
        throw new TokenRevokedException();
      }

      const user = await this.prismaService.users.findUnique({
        where: { id: userId },
      });
      if (!user) {
        this.logger.warn('User not found', { userId });
        throw new Error('User not found');
      }

      // Compare refreshToken với hashed_refresh_token
      const isMatch = await bcrypt.compare(refreshToken, user.hashed_refresh_token);
      if (!isMatch) {
        await this.revokeToken(oldJti, userId, 'refresh', new Date(payload.exp * 1000));
        this.logger.warn('Detected refresh token reuse attempt', { jti: oldJti });
        throw new TokenReusedException();
      }

      await this.revokeToken(oldJti, userId, 'refresh', new Date(payload.exp * 1000));

      const newAccessTokenPayload: JwtPayload = {
        sub: userId,
        email: user.email,
        role: user.role,
        jti: randomUUID(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 15,
      };

      const newRefreshTokenPayload: JwtPayload = {
        sub: userId,
        jti: randomUUID(),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
      };

      const newAccessToken = this.jwtService.generateAccessToken(newAccessTokenPayload);
      const newRefreshToken = this.jwtService.generateRefreshToken(newRefreshTokenPayload);

      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

      await this.prismaService.users.update({
        where: { id: userId },
        data: {
          hashed_refresh_token: hashedRefreshToken,
          updated_at: new Date(),
        },
      });

      await this.rabbitMQService.publish('token_refreshed', {
        userId: userId,
        timestamp: new Date(),
      });

      this.logger.log('Token refreshed successfully', { userId });

      return {
        statusCode: 200,
        message: 'Làm mới token thành công',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      };
    } catch (error) {
      this.logger.error('Token refresh failed', { error: error.message });
      throw error;
    }
  }

  /**
   * 3. Xử lý đăng xuất
   * - Nhận userId (hoặc payload có jti)
   * - Xoá hashed_refresh_token trong bảng users
   * - Thêm jti vào bảng revoked_tokens
   * - Trả { message: 'Logout thành công' }
   */
  async logout(data: { userId: string; accessToken?: string; refreshToken?: string }): Promise<ServiceResponse<null>> {
    const { userId, accessToken, refreshToken } = data;
    this.logger.log('Logging out user', { userId });

    try {
      const user = await this.prismaService.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        this.logger.warn('User not found for logout', { userId });
        throw new Error('User not found');
      }

      if (accessToken) {
        const accessPayload = this.jwtService.verifyAccessToken(accessToken);
        if (accessPayload) {
          await this.revokeToken(accessPayload.jti, userId, 'access', new Date(accessPayload.exp * 1000));
          this.logger.log('Access token revoked', { jti: accessPayload.jti });
        }
      }

      if (refreshToken) {
        const refreshPayload = this.jwtService.verifyRefreshToken(refreshToken);
        if (refreshPayload && (await bcrypt.compare(refreshToken, user.hashed_refresh_token))) {
          await this.revokeToken(refreshPayload.jti, userId, 'refresh', new Date(refreshPayload.exp * 1000));
          await this.prismaService.users.update({
            where: { id: userId },
            data: { hashed_refresh_token: null },
          });
          this.logger.log('Refresh token revoked and hash cleared', { jti: refreshPayload.jti });
        }
      } else {
        // Nếu không có refresh token thì cũng clear luôn
        await this.prismaService.users.update({
          where: { id: userId },
          data: { hashed_refresh_token: null },
        });
        this.logger.log('Cleared hashed refresh token without provided token', { userId });
      }

      this.logger.log('User logged out successfully', { userId });
      return { statusCode: 200, message: 'Logout successful', data: null };
    } catch (error) {
      this.logger.error('Logout failed', { error: error.message });
      throw error;
    }
  }

  /**
   * 4. Xác thực accessToken từ các service khác → trả user info
   * - Nhận accessToken từ client
   * - Verify JWT → giải mã AES → kiểm tra exp
   * - Nếu hợp lệ thì trả về thông tin người dùng
   * - Nếu không hợp lệ thì trả về lỗi UnauthorizedException
   */
  async validateToken(accessToken: string): Promise<ServiceResponse<JwtPayload>> {
    const payload = this.jwtService.verifyAccessToken(accessToken);

    if (!payload) {
      throw new Error('Invalid token');
    }

    const isRevoked = await this.isTokenRevoked(payload.jti);

    if (isRevoked) {
      throw new TokenRevokedException();
    }

    return {
      statusCode: 200,
      message: 'Token is valid',
      data: payload,
    };
  }

  /**
   * 5. Xử lý callback đăng nhập ngầm (Silent Login) từ Google OAuth
   * - Nhận code từ Google trong trường hợp silent login.
   * - Đổi code lấy access_token và id_token qua GoogleStrategy.
   * - Trả về id_token để phía client có thể tự xử lý tiếp.
   * - Không tạo hoặc cập nhật người dùng trong DB.
   * - Dùng trong các tình huống auto-login hoặc refresh session phía client.
   */
  async handleGoogleSilentCallback(code: string): Promise<{ idToken: string }> {
    this.logger.log('Handling Google silent callback', { code });

    try {
      const tokens = await this.googleStrategy.exchangeCodeForTokens(code);

      if (!tokens.id_token) {
        this.logger.error('No id_token returned from Google');
        throw new Error('No id_token returned from Google');
      }

      return { idToken: tokens.id_token };
    } catch (error) {
      this.logger.error('Google silent callback failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 6. Lưu jti vào bảng revoked_tokens
   * - Nhận jti, userId, tokenType, expiresAt từ client
   * - Lưu vào bảng revoked_tokens
   */
  async revokeToken(jti: string, userId: string, tokenType: string, expiresAt: Date) {
    await this.prismaService.revoked_tokens.create({
      data: {
        jti,
        user_id: userId,
        token_type: tokenType,
        expires_at: expiresAt,
      },
    });
    this.logger.log('Token revoked', { jti, tokenType });
  }

  /**
   * 7. Kiểm tra xem jti đã bị thu hồi chưa
   * - Nhận jti từ client
   * - Kiểm tra trong bảng revoked_tokens
   * - Nếu có thì trả về true, nếu không thì trả về false
   */
  async isTokenRevoked(jti: string): Promise<boolean> {
    const token = await this.prismaService.revoked_tokens.findFirst({
      where: { jti },
    });
    return !!token;
  }

  /**
   * 8. Xác thực ID Token từ Google
   * - Nhận id_token từ phía client (đã đăng nhập Google).
   * - Xác thực tính hợp lệ của id_token qua GoogleStrategy.
   * - Nếu hợp lệ, trích xuất thông tin người dùng từ payload.
   * - Tìm hoặc tạo người dùng trong database dựa trên email/sub.
   * - Trả về thông tin người dùng tương ứng trong hệ thống.
   */
  async verifyIdToken(idToken: string): Promise<ServiceResponse<any>> {
    this.logger.log('Verifying ID token', {
      idToken: idToken.substring(0, 10) + '...',
    });

    try {
      const payload = await this.googleStrategy.validateIdToken(idToken);

      // Tìm hoặc tạo user trong database
      let user = await this.prismaService.users.findUnique({
        where: { email: payload.email },
      });

      if (!user) {
        user = await this.prismaService.users.create({
          data: {
            email: payload.email,
            display_name: payload.name,
            avatar_url: payload.picture,
            oauth_provider: 'google',
            oauth_id: payload.sub,
          },
        });
      }

      this.logger.log('ID token verification successful', { userId: user.id });
      return {
        statusCode: 200,
        message: 'ID token verification successful',
        data: { user },
      };
    } catch (error) {
      this.logger.error('ID token verification failed', {
        error: error.message,
      });
      throw new Error(`Invalid id_token: ${error.message}`);
    }
  }
}
