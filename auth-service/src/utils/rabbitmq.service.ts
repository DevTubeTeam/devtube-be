import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Channel, connect, Connection } from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: Connection;
  private channel: Channel;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.close();
  }

  async connect() {
    this.connection = await connect(
      this.configService.get<string>('RABBITMQ_URL'),
    );
    this.channel = await this.connection.createChannel();
    await this.channel.assertQueue('user_logged_in', { durable: true });
    await this.channel.assertQueue('token_refreshed', { durable: true });
  }

  async publish(queue: string, message: any) {
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
  }

  async close() {
    await this.channel.close();
    await this.connection.close();
  }
}
