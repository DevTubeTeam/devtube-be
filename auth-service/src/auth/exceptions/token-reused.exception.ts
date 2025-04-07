import { HttpException, HttpStatus } from '@nestjs/common';

export class TokenReusedException extends HttpException {
  constructor() {
    super('Token has already been used', HttpStatus.FORBIDDEN);
  }
}
