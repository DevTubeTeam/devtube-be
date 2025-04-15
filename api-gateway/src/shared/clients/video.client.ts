import { ConfigService } from '@nestjs/config';
import {
  ClientProxyFactory,
  RmqOptions,
  Transport,
} from '@nestjs/microservices';

export const VideoClientProxy = (config: ConfigService) => {
  return ClientProxyFactory.create({
    transport: Transport.RMQ,
    options: {
      urls: [config.get<string>('RABBITMQ_URL')],
      queue: 'video_queue',
      queueOptions: {
        durable: false,
      },
    },
  } as RmqOptions);
};
