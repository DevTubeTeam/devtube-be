import { AppModule } from '@/app.module';
import { HttpExceptionFilter } from '@/shared/filters/http-exception.filter';
import { ErrorInterceptor } from '@/shared/interceptors/error.interceptor';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const configService = appContext.get(ConfigService);

  const rabbitmqUrl = configService.get<string>('rabbitmq.url');
  const rabbitmqQueue = configService.get<string>('rabbitmq.queue');

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [rabbitmqUrl],
        queue: rabbitmqQueue,
        queueOptions: {
          durable: false,
        },
        persistent: true,
      },
    },
  );

  // Sử dụng filter toàn cục
  app.useGlobalFilters(new HttpExceptionFilter());

  // Sử dụng interceptor toàn cục
  app.useGlobalInterceptors(new ErrorInterceptor());

  await app.listen();
}
bootstrap();
