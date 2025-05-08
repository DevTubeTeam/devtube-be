import { RmqClientsModule } from '@/rmq-clients.module';
import { UploadController } from '@/services/upload/upload.controller';
import { LoggerService } from '@/shared/utils/logger.service';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  controllers: [UploadController],
  imports: [RmqClientsModule],
  providers: [
    { provide: LoggerService, useValue: new LoggerService('UploadGateway') },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
  ],
})
export class UploadModule {}
