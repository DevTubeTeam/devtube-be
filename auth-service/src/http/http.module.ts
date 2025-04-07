import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (configService: ConfigService): AxiosRequestConfig => ({
        timeout: 5000,
        maxRedirects: 5,
        baseURL: configService.get<string>('API_BASE_URL'), // Ví dụ: cấu hình baseURL từ .env
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [HttpModule],
})
export class CustomHttpModule {}
