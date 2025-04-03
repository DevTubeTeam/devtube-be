import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {

  constructor(private readonly authService: AuthService) { }

  @MessagePattern('auth_google_callback')
  async handleGoogleCallback(data: { code: string }) {
    return this.authService.handleGoogleCallback(data.code);
  }

}

