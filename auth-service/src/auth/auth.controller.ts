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
  async logout(data: { userId: string; accessToken?: string; refreshToken?: string }) {
    return this.authService.logout(data);
  }

  @MessagePattern('auth_validate_token')
  async validateToken(data: { token: string }) {
    return this.authService.validateToken(data.token);
  }

  @MessagePattern('auth_google_silent_callback')
  async handleGoogleSilentCallback(data: { code: string }) {
    return this.authService.handleGoogleSilentCallback(data.code);
  }

  @MessagePattern('auth_verify_id_token')
  async verifyIdToken(data: { idToken: string }) {
    return this.authService.verifyIdToken(data.idToken);
  }
}
