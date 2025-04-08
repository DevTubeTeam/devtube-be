import { AuthService } from '@/auth/auth.service';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth_google_callback')
  async handleGoogleCallback(data: { code: string }) {
    return this.authService.handleGoogleCallback(data.code);
  }

  @MessagePattern('auth_refresh_token')
  async refreshAccessToken(data: { refreshToken: string }) {
    return this.authService.refreshAccessToken(data.refreshToken);
  }

  @MessagePattern('auth_logout')
  async logout(data: { userId: string }) {
    return this.authService.logout(data.userId);
  }

  @MessagePattern('auth_validate_token')
  async validateToken(data: { token: string }) {
    return this.authService.validateToken(data.token);
  }
}
