import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class GetPresignedUrlDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsNumber()
  @Min(1)
  fileSize: number;
}
