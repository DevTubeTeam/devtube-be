import { fail } from '@/shared/utils/response.util';
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
  Redirect,
  Req,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { lastValueFrom } from 'rxjs';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy
  ) {}

  @Get('google/callback')
  @ApiResponse({
    status: 200,
    description: 'Handle Google OAuth callback',
  })
  async handleGoogleCallback(@Query('code') code: string) {
    return await lastValueFrom(
      this.authClient.send('auth_google_callback', { code })
    );
  }

  @Post('refresh')
  @ApiResponse({
    status: 200,
    description: 'Refresh accessToken',
  })
  async refreshAccessToken(@Body() body: { refreshToken: string }) {
    const { refreshToken } = body;
    if (!refreshToken) {
      return fail('RefreshToken Not Found', 401);
    }

    return await lastValueFrom(
      this.authClient.send('auth_refresh_token', { refreshToken })
    );
  }

  @Post('logout')
  @ApiResponse({
    status: 200,
    description: 'User Logout and Invalidate Token',
  })
  async logout(@Req() req: Request) {
    const userId = req.body?.userId;
    if (!userId) {
      return fail('UserID Not Found', 400);
    }

    return await lastValueFrom(this.authClient.send('auth_logout', { userId }));
  }

  /**
   * Redirect user to Google's silent login URL with prompt=none
   * (User must have active Google session)
   */
  @Get('silent')
  @Redirect()
  forwardSilentGoogleLogin(): { url: string; statusCode: number } {
    const query = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      redirect_uri: process.env.GOOGLE_SILENT_REDIRECT_URI!,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'none',
    });

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${query.toString()}`,
      statusCode: 302,
    };
  }

  /**
   * Callback handler after silent login
   * Will forward code to auth-service to exchange for new id_token
   */
  @Get('silent/callback')
  async forwardSilentGoogleCallback(@Query('code') code: string) {
    return await lastValueFrom(
      this.authClient.send('auth_google_silent_callback', { code })
    );
  }
}
