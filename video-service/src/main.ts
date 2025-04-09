import { AppModule } from '@/app.module';
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
  await app.listen();

  //Run Video-Service with port : 3001

  // // Kết nối microservice (RabbitMQ)
  // app.connectMicroservice<MicroserviceOptions>({
  //   transport: Transport.RMQ,
  //   options: {
  //     urls: [rabbitmqUrl],
  //     queue: rabbitmqQueue,
  //     queueOptions: {
  //       durable: false,
  //     },
  //     persistent: true,
  //   },
  // });

  // await app.startAllMicroservices(); // Khởi động microservice (RabbitMQ)
  // await app.listen(3001); // Bật HTTP server để test Postman / Swagger
  // console.log('🚀 Video Service is running on http://localhost:3001');
  
}
bootstrap();
