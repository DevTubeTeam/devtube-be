import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token to generate new access token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
