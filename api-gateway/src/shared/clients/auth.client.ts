import { ConfigService } from '@nestjs/config';
import {
  ClientProxyFactory,
  Transport,
  RmqOptions,
} from '@nestjs/microservices';

export const AuthClientProxy = (config: ConfigService) => {
  return ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: [config.get<string>('RABBITMQ_URL')],
      queue: 'auth_queue',
      queueOptions: {
        durable: false,
      },
    },
  } as RmqOptions);
};
