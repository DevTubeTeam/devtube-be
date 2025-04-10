import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthClientProxy } from '@/shared/clients/auth.client';
import { VideoClientProxy } from './shared/clients/video.client';

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
  ],
  exports: ['AUTH_SERVICE', 'VIDEO_SERVICE'],
})
export class RmqClientsModule {}
