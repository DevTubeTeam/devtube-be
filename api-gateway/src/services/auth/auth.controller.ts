import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy
  ) {}

  @Get('google/callback')
  async handleGoogleCallback(@Query('code') code: string) {
    return this.authClient.send('auth_google_callback', { code });
  }
}
