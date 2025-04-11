import { RmqClientsModule } from '@/rmq-clients.module';
import { AuthModule } from '@/services/auth/auth.module';
import { UploadModule } from '@/services/upload/upload.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    AuthModule,
    RmqClientsModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UploadModule,
  ],
})
export class AppModule {}
