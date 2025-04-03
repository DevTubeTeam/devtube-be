import { AuthModule } from '@/services/auth/auth.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RmqClientsModule } from '@/rmq-clients.module';

@Module({
  imports: [
    AuthModule,
    RmqClientsModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
})
export class AppModule {}
