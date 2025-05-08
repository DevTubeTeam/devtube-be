// services/upload/dto/complete-multipart-upload.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

class Part {
  @IsString()
  @IsNotEmpty()
  ETag: string;

  @IsNumber()
  PartNumber: number;
}

export class CompleteMultipartUploadDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  uploadId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Part)
  parts: Part[];

  @IsString()
  @IsNotEmpty()
  idToken: string;
}
