import { AuthModule } from '@/auth/auth.module';
import { databaseConfig, rabbitmqConfig } from '@/config/config';
import { CustomHttpModule } from '@/http/http.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [rabbitmqConfig, databaseConfig],
    }),
    PrismaModule,
    CustomHttpModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
