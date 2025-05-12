import { fail } from '@/shared/utils/response.util';
import { Body, Controller, Get, HttpStatus, Inject, Post, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags
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
  @ApiOkResponse({ description: 'Google OAuth callback processed successfully' })
  @ApiBadRequestResponse({ description: 'Authorization code is missing' })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'Google authorization code',
  })
  async handleGoogleCallback(@Query('code') code: string): Promise<ServiceResponse> {
    if (!code) {
      return fail('Authorization code is required', HttpStatus.BAD_REQUEST);
    }
    return await lastValueFrom(
      this.authClient.send('auth_google_callback', { code })
    );
  }

  @Get('silent/callback')
  @ApiOperation({ summary: 'Handle Google silent login callback' })
  @ApiOkResponse({ description: 'Returns new id_token' })
  @ApiBadRequestResponse({ description: 'Authorization code is missing' })
  @ApiQuery({
    name: 'code',
    required: true,
    description: 'Google authorization code',
  })
  async forwardSilentGoogleCallback(@Query('code') code: string): Promise<ServiceResponse> {
    if (!code) {
      return fail('Authorization code is required', HttpStatus.BAD_REQUEST);
    }

    return await lastValueFrom(
      this.authClient.send('auth_google_silent_callback', { code })
    );
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiOkResponse({ description: 'Returns new access and refresh tokens' })
  @ApiBadRequestResponse({ description: 'Refresh token is missing' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshAccessToken(@Body() { refreshToken }: RefreshTokenDto): Promise<ServiceResponse> {
    if (!refreshToken) {
      return fail('Refresh token is required', HttpStatus.BAD_REQUEST);
    }

    return await lastValueFrom(
      this.authClient.send('auth_refresh_token', { refreshToken })
    );
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user and invalidate tokens' })
  @ApiOkResponse({ description: 'Logout successful' })
  @ApiBadRequestResponse({ description: 'User ID is missing' })
  @ApiBody({ type: LogoutDto })
  async logout(@Body() { userId, accessToken, refreshToken }: LogoutDto): Promise<ServiceResponse> {
    if (!userId) {
      return fail('User ID is required', HttpStatus.BAD_REQUEST);
    }

    return await lastValueFrom(
      this.authClient.send('auth_logout', { userId, accessToken, refreshToken })
    );
  }

  @Post('verify-id-token')
  @ApiOperation({ summary: 'Verify Google ID token' })
  @ApiOkResponse({ description: 'Returns user info if ID token is valid' })
  @ApiBadRequestResponse({ description: 'ID token is missing' })
  @ApiBody({ type: VerifyIdTokenDto })
  async verifyIdToken(@Body() { idToken }: VerifyIdTokenDto): Promise<ServiceResponse> {
    if (!idToken) {
      return fail('ID token is required', HttpStatus.BAD_REQUEST);
    }

    return await lastValueFrom(
      this.authClient.send('auth_verify_id_token', { idToken })
    );
  }
}
