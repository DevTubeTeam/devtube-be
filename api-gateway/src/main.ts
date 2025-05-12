import { AppModule } from '@/app.module';
import GlobalExceptionsFilter from '@/shared/filters/global-exception.filter';
import { ResponseInterceptor } from '@/shared/interceptors/transform-response.interceptor';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    credentials: true,
  });
  app.setGlobalPrefix('api');

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalFilters(new GlobalExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: false,
    })
  );

  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('API Gateway for DevTube Platform')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(8080);
}

bootstrap();
