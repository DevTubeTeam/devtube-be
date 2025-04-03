import { RmqClientsModule } from '@/rmq-clients.module';
import { AuthController } from '@/services/auth/auth.controller';
import { Module } from '@nestjs/common';

@Module({
  controllers: [AuthController],
  imports: [RmqClientsModule],
})
export class AuthModule {}
