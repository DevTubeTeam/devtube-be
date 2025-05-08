import { fail } from '@/shared/utils/response.util';
import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { lastValueFrom } from 'rxjs';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { VerifyIdTokenDto } from './dto/verify-id-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy
  ) {}

  @Get('google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'Handle Google OAuth callback',
  })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'Google authorization code',
  })
  async handleGoogleCallback(@Query('code') code: string) {
    if (!code) {
      return fail('Authorization code is required', 400);
    }
    return await lastValueFrom(
      this.authClient.send('auth_google_callback', { code })
    );
  }


  @Get('silent/callback')
  @ApiOperation({ summary: 'Handle Google silent login callback' })
  @ApiResponse({ status: 200, description: 'Returns new id_token' })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'Google authorization code',
  })
  async forwardSilentGoogleCallback(@Query('code') code: string) {
    if (!code) {
      return fail('Authorization code is required', 400);
    }

    return await lastValueFrom(
      this.authClient.send('auth_google_silent_callback', { code })
    );
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Returns new access and refresh tokens',
  })
  @ApiBody({ type: RefreshTokenDto })
  async refreshAccessToken(@Body() body: RefreshTokenDto) {
    const { refreshToken } = body;
    if (!refreshToken) {
      return fail('Refresh token is required', 400);
    }

    return await lastValueFrom(
      this.authClient.send('auth_refresh_token', { refreshToken })
    );
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user and invalidate tokens' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiBody({ type: LogoutDto })
  async logout(@Body() body: LogoutDto) {
    const { userId, accessToken, refreshToken } = body;
    if (!userId) {
      return fail('User ID is required', 400);
    }

    return await lastValueFrom(
      this.authClient.send('auth_logout', { userId, accessToken, refreshToken })
    );
  }

  @Post('verify-id-token')
  @ApiOperation({ summary: 'Verify Google ID token' })
  @ApiResponse({
    status: 200,
    description: 'Returns user info if ID token is valid',
  })
  @ApiBody({ type: VerifyIdTokenDto })
  async verifyIdToken(@Body() body: VerifyIdTokenDto) {
    const { idToken } = body;
    if (!idToken) {
      return fail('ID token is required', 400);
    }

    return await lastValueFrom(
      this.authClient.send('auth_verify_id_token', { idToken })
    );
  }
}
