import {
  InvalidRefreshTokenException,
  TokenRevokedException,
} from '@/auth/exceptions';
import { NoRefreshTokenFoundException } from '@/auth/exceptions/no-refresh-token-found.exception';
import {
  IAuthLoginResponse,
  IExchangeCodeForTokenResponse,
  IRefreshTokenResponse,
} from '@/auth/interface/auth-response.interface';
import { googleOAuthConfig } from '@/config/config';
import { JwtPayload } from '@/jwt/interface/jwt.payload';
import { JwtServiceCustom } from '@/jwt/jwt.service';
import { PrismaService } from '@/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { firstValueFrom } from 'rxjs';
import { TokenReusedException } from './exceptions/token-reused.exception';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly httpService: HttpService,
    private readonly jwtService: JwtServiceCustom, // Sử dụng JwtServiceCustom
  ) {}

  /**
   * 1. Xử lý callback từ Google OAuth
   * - Nhận code từ Google gửi về
   * - Gọi API của Google để lấy access_token (exchangeCodeForAccessToken)
   * - Gọi API của Google để lấy thông tin người dùng
   * - Kiểm tra xem người dùng đã tồn tại trong DB chưa
   * - Nếu có thì update thông tin người dùng
   * - Nếu không thì tạo mới người dùng
   * - Tạo access_token và refresh_token cho người dùng
   * - Lưu refresh_token vào DB (hashed)
   * - Trả về access_token, refresh_token và thông tin người dùng
   */
  async handleGoogleCallback(
    code: string,
  ): Promise<ServiceResponse<IAuthLoginResponse>> {
    const tokens = await this.exchangeCodeForAccessToken(code);

    const userInfo = await this.getUserInfoFromGoogle(tokens.accessToken);

    console.log(userInfo);

    if (!userInfo || !userInfo.id) {
      throw new Error('Invalid user information received from Google');
    }

    const user = await this.prismaService.users.upsert({
      where: {
        oauth_provider_oauth_id: {
          oauth_provider: 'google',
          oauth_id: userInfo.id, // Use `id` instead of `sub`
        },
      },
      update: {
        display_name: userInfo.name,
        avatar_url: userInfo.picture,
        email_verified: userInfo.verified_email, // Use `verified_email`
        last_login: new Date(),
      },
      create: {
        display_name: userInfo.name,
        email: userInfo.email,
        avatar_url: userInfo.picture,
        locale: null, // Set to null as `locale` is not provided
        email_verified: userInfo.verified_email, // Use `verified_email`
        oauth_provider: 'google',
        oauth_id: userInfo.id, // Use `id` instead of `sub`
        metadata: userInfo, // Save the entire payload
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
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
    };

    const newAccessToken =
      this.jwtService.generateAccessToken(accessTokenPayload);

    const refreshToken =
      this.jwtService.generateRefreshToken(refreshTokenPayload);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.prismaService.users.update({
      where: { id: user.id },
      data: { hashed_refresh_token: hashedRefreshToken },
    });

    return {
      statusCode: 200,
      message: 'Login successful',
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken,
          idToken: tokens.idToken,
        },
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
        },
      },
    };
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
  async refreshAccessToken(
    refreshToken: string,
  ): Promise<ServiceResponse<IRefreshTokenResponse>> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    if (!payload) {
      throw new InvalidRefreshTokenException();
    }

    const { sub: userId, jti: oldJti } = payload;

    const isRevoked = await this.isTokenRevoked(oldJti);
    if (isRevoked) {
      throw new TokenRevokedException();
    }

    const user = await this.prismaService.users.findUnique({
      where: { id: userId },
    });

    const isMatch = await bcrypt.compare(
      refreshToken,
      user.hashed_refresh_token,
    );
    if (!isMatch) {
      await this.revokeToken(
        oldJti,
        userId,
        'refresh',
        new Date(payload.exp * 1000),
      );
      throw new TokenReusedException();
    }

    await this.revokeToken(
      oldJti,
      userId,
      'refresh',
      new Date(payload.exp * 1000),
    );

    const newAccessTokenPayload: JwtPayload = {
      sub: userId,
      email: user.email,
      role: user.role,
      jti: randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 15, // 15 phút
    };

    const newRefreshTokenPayload: JwtPayload = {
      sub: userId,
      jti: randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 ngày
    };

    const newAccessToken = this.jwtService.generateAccessToken(
      newAccessTokenPayload,
    );
    const newRefreshToken = this.jwtService.generateRefreshToken(
      newRefreshTokenPayload,
    );

    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

    await this.prismaService.users.update({
      where: { id: userId },
      data: {
        hashed_refresh_token: hashedRefreshToken,
        updated_at: new Date(),
      },
    });

    return {
      statusCode: 200,
      message: 'Làm mới token thành công',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    };
  }

  /**
   * 3. Xử lý đăng xuất
   * - Nhận userId (hoặc payload có jti)
   * - Xoá hashed_refresh_token trong bảng users
   * - Thêm jti vào bảng revoked_tokens
   * - Trả { message: 'Logout thành công' }
   */
  async logout(userId: string): Promise<ServiceResponse<null>> {
    const user = await this.prismaService.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const hashedRefreshToken = user.hashed_refresh_token;

    if (!hashedRefreshToken) {
      throw new NoRefreshTokenFoundException();
    }

    await this.prismaService.users.update({
      where: { id: userId },
      data: { hashed_refresh_token: null },
    });

    await this.revokeToken(
      userId,
      hashedRefreshToken,
      'refresh',
      new Date(Date.now() + 60 * 60 * 24 * 7),
    );

    return {
      statusCode: 200,
      message: 'Logout successful',
      data: null,
    };
  }

  /**
   * 4. Xác thực accessToken từ các service khác → trả user info
   * - Nhận accessToken từ client
   * - Verify JWT → giải mã AES → kiểm tra exp
   * - Nếu hợp lệ thì trả về thông tin người dùng
   * - Nếu không hợp lệ thì trả về lỗi UnauthorizedException
   */
  async validateToken(
    accessToken: string,
  ): Promise<ServiceResponse<JwtPayload>> {
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
   * 5. Xử lý callback từ Google OAuth (silent login)
   * - Nhận code từ Google gửi về
   * - Gọi API của Google để lấy access_token (exchangeCodeForAccessToken)
   * - Gọi API của Google để lấy thông tin người dùng
   * - Kiểm tra xem người dùng đã tồn tại trong DB chưa
   * - Nếu có thì update thông tin người dùng
   * - Nếu không thì tạo mới người dùng
   * - Tạo access_token và refresh_token cho người dùng
   * - Lưu refresh_token vào DB (hashed)
   * - Trả về access_token, refresh_token và thông tin người dùng
   * - Nếu không có code thì trả về lỗi
   * - Nếu có lỗi thì trả về lỗi
   *
   */
  async handleGoogleSilentCallback(code: string): Promise<{ idToken: string }> {
    const tokenResponse = await this.exchangeCodeForAccessToken(code);

    if (!tokenResponse.idToken) {
      throw new Error('No id_token returned from Google');
    }

    return {
      idToken: tokenResponse.idToken,
    };
  }

  async revokeToken(
    jti: string,
    userId: string,
    tokenType: string,
    expiresAt: Date,
  ) {
    await this.prismaService.revoked_tokens.create({
      data: {
        jti,
        user_id: userId,
        token_type: tokenType,
        expires_at: expiresAt,
      },
    });
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    const token = await this.prismaService.revoked_tokens.findFirst({
      where: { jti },
    });
    return !!token;
  }

  private async exchangeCodeForAccessToken(
    code: string,
  ): Promise<IExchangeCodeForTokenResponse> {
    const payload = new URLSearchParams();

    const { clientID, clientSecret, callbackURL, grantType } =
      googleOAuthConfig();

    payload.append('code', code);
    payload.append('client_id', clientID);
    payload.append('client_secret', clientSecret);
    payload.append('redirect_uri', callbackURL);
    payload.append('grant_type', grantType);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://oauth2.googleapis.com/token',
          payload.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      return {
        accessToken: response.data.access_token,
        idToken: response.data.id_token,
      };
    } catch (error) {
      if (error.response) {
        console.error('Google OAuth error response:', error.response.data);
      } else {
        console.error('Google OAuth error:', error.message);
      }
      throw error;
    }
  }

  private async getUserInfoFromGoogle(accessToken: string): Promise<any> {
    const response = await firstValueFrom(
      this.httpService.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    return response.data;
  }
}
