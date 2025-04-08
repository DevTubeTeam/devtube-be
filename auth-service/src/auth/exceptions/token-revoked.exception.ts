import { HttpException, HttpStatus } from '@nestjs/common';

export class TokenRevokedException extends HttpException {
  constructor() {
    super('Token has been revoked', HttpStatus.UNAUTHORIZED);
  }
}
