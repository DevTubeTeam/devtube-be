import { RmqClientsModule } from '@/rmq-clients.module';
import { UploadController } from '@/services/upload/upload.controller';
import { Module } from '@nestjs/common';

@Module({
  controllers: [UploadController],
  imports: [RmqClientsModule],
})
export class UploadModule {}
