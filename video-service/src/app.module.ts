import { databaseConfig, rabbitmqConfig } from '@/config/config';
import { VideoModule } from '@/video/video.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';

@Module({
  imports: [
    VideoModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [rabbitmqConfig, databaseConfig],
    }),
    PrismaModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
