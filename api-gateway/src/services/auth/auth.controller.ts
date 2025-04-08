import { fail } from '@/shared/utils/response.util';
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Query,
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
    description: 'Làm mới accessToken',
  })
  async refreshAccessToken(@Body() body: { refreshToken: string }) {
    const { refreshToken } = body;
    if (!refreshToken) {
      return fail('Không tìm thấy refreshToken', 401);
    }

    return await lastValueFrom(
      this.authClient.send('auth_refresh_token', { refreshToken })
    );
  }

  @Post('logout')
  @ApiResponse({
    status: 200,
    description: 'Logout user và revoke refresh token',
  })
  async logout(@Req() req: Request) {
    const userId = req.body?.userId;
    if (!userId) {
      return fail('Thiếu userId để logout', 400);
    }

    return await lastValueFrom(this.authClient.send('auth_logout', { userId }));
  }
}
