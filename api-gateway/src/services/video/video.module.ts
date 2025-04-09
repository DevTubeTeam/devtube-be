import { RmqClientsModule } from '@/rmq-clients.module';
import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';

@Module({
  controllers: [VideoController],
  imports: [
    RmqClientsModule,
  ],
})
export class VideoModule {}
