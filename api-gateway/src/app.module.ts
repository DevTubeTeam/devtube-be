import { RmqClientsModule } from '@/rmq-clients.module';
import { AuthModule } from '@/services/auth/auth.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServicesModule } from './video/services/services.module';
import { UploadModule } from './services/upload/upload.module';

@Module({
  imports: [
    AuthModule,
    RmqClientsModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServicesModule,
    UploadModule,
  ],
})
export class AppModule {}
