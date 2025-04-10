import { RmqClientsModule } from '@/rmq-clients.module';
import { AuthModule } from '@/services/auth/auth.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VideoModule } from './services/video/video.module';

@Module({
  imports: [
    AuthModule,
    VideoModule,
    RmqClientsModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
