import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { googleOAuthConfig } from '@/config/config';
import { JwtModule } from '@/jwt/jwt.module';
import { PrismaService } from '@/prisma/prisma.service';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [AuthService, PrismaService],
  controllers: [AuthController],
  imports: [ConfigModule.forFeature(googleOAuthConfig), JwtModule, HttpModule],
  exports: [AuthService],
})
export class AuthModule {}
