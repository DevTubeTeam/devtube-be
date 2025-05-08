import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

@Injectable()
export class GoogleStrategy {
  private readonly logger = new Logger(GoogleStrategy.name);
  private readonly client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new OAuth2Client({
      clientId: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: this.configService.get<string>('GOOGLE_SECRET'),
      redirectUri: this.configService.get<string>('CALLBACK_URL'),
    });
  }

  async validateIdToken(idToken: string): Promise<any> {
    this.logger.log('Validating ID token', {
      idToken: idToken.substring(0, 10) + '...',
    });

    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid id_token: No payload');
      }

      if (payload.iss !== 'https://accounts.google.com') {
        throw new Error('Invalid id_token: Invalid issuer');
      }
      if (payload.aud !== this.configService.get<string>('GOOGLE_CLIENT_ID')) {
        throw new Error('Invalid id_token: Invalid audience');
      }

      this.logger.log('ID token verified', { payload });
      return payload;
    } catch (error) {
      this.logger.error('Validate ID token error', { error: error.message });
      throw new Error(`Invalid id_token: ${error.message}`);
    }
  }

  async exchangeCodeForTokens(code: string) {
    try {
      const tokenResponse = await this.client.getToken(code);
      return tokenResponse.tokens;
    } catch (error) {
      console.error('Google Token Exchange Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Token exchange failed');
    }
  }
}
