import { IsNotEmpty, IsString } from 'class-validator';

export class AbortMultipartUploadDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  uploadId: string;

  @IsString()
  @IsNotEmpty()
  idToken: string;
}

export class DeleteFileDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  idToken: string;
}
