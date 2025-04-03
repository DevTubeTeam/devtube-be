import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { AuthClientProxy } from './shared/clients/auth.client';
import { AuthClientProxy } from '@/shared/clients/auth.client';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'AUTH_SERVICE',
      useFactory: AuthClientProxy,
      inject: [ConfigService],
    },
  ],
  exports: ['AUTH_SERVICE'],
})
export class RmqClientsModule {}
