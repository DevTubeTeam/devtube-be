import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class LogoutDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Access token (optional)', required: false })
  @IsString()
  @IsOptional()
  accessToken?: string;

  @ApiProperty({ description: 'Refresh token (optional)', required: false })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
