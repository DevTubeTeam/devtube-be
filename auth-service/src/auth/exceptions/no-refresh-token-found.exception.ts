import { HttpException, HttpStatus } from '@nestjs/common';

export class NoRefreshTokenFoundException extends HttpException {
  constructor() {
    super('No refresh token found for the user', HttpStatus.UNAUTHORIZED);
  }
}
