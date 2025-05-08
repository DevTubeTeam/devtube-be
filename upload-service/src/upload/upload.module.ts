import { UploadController } from '@/upload/upload.controller';
import { UploadService } from '@/upload/upload.service';
import { LoggerService } from '@/utils/logger.service';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ConfigModule, // <-- Thêm cái này nếu chưa có
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.get<string>('authService.url')],
            queue: configService.get<string>('authService.queue'),
            queueOptions: { durable: false },
            persistent: true,
          },
        }),
      },
    ]),
  ],
  controllers: [UploadController],
  providers: [
    UploadService,
    { provide: LoggerService, useValue: new LoggerService('UploadService') },
  ],
  exports: [UploadService],
})
export class UploadModule {}
