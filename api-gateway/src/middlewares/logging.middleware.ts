import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: Function) {
    console.log(`[${req.method}] ${req.url}`);
    next();
  }
}
