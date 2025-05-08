import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { GoogleStrategy } from '@/auth/strategy/google.strategy';
import { googleOAuthConfig } from '@/config/config';
import { JwtModule } from '@/jwt/jwt.module';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/utils/logger.service';
import { RabbitMQService } from '@/utils/rabbitmq.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [
    AuthService,
    PrismaService,
    GoogleStrategy,
    { provide: LoggerService, useValue: new LoggerService('AuthService') },
    RabbitMQService,
  ],
  controllers: [AuthController],
  imports: [ConfigModule.forFeature(googleOAuthConfig), JwtModule],
  exports: [AuthService],
})
export class AuthModule {}
