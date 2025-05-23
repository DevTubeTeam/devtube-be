import { jwtConfig } from '@/config/jwt.config';
import { RmqClientsModule } from '@/rmq-clients.module';
import { AuthController } from '@/services/auth/auth.controller';
import { JwtAuthGuard } from '@/services/auth/guards/jwt-auth.guard';
import { JwtStrategy } from '@/services/auth/strategies/jwt.strategy';
import { LoggerService } from '@/shared/utils/logger.service';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  controllers: [AuthController],
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>(`${String(jwtConfig.KEY)}.refresh.secret`),
        signOptions: {
          expiresIn: config.get(`${String(jwtConfig.KEY)}.refresh.expiresIn`),
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forFeature(jwtConfig),
    RmqClientsModule,
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    { provide: LoggerService, useValue: new LoggerService('AuthGateway') },
  ],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
