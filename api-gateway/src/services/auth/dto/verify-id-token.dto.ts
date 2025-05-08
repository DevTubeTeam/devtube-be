import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyIdTokenDto {
  @ApiProperty({ description: 'Google ID token to verify' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
