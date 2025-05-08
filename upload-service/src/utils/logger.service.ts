import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService {
  private logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  log(message: string, metadata?: Record<string, any>) {
    this.logger.log(message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>) {
    this.logger.warn(message, metadata);
  }

  error(message: string, metadata?: Record<string, any>) {
    this.logger.error(message, metadata);
  }
}
