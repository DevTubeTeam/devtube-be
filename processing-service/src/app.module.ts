import { databaseConfig, rabbitmqConfig } from '@/config/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { PrismaService } from '@/prisma/prisma.service';
import { ProcessorModule } from '@/processor/processor.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ProcessorModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [rabbitmqConfig, databaseConfig],
    }),
    PrismaModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
