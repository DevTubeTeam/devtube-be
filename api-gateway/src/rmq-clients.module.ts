import {
  AuthClientProxy,
  UploadClientProxy,
  VideoClientProxy,
} from '@/shared/clients';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'AUTH_SERVICE',
      useFactory: AuthClientProxy,
      inject: [ConfigService],
    },
    {
      provide: 'VIDEO_SERVICE',
      useFactory: VideoClientProxy,
      inject: [ConfigService],
    },
    {
      provide: 'UPLOAD_SERVICE',
      useFactory: UploadClientProxy,
      inject: [ConfigService],
    },
  ],
  exports: ['AUTH_SERVICE', 'VIDEO_SERVICE', 'UPLOAD_SERVICE'],
})
export class RmqClientsModule {}
