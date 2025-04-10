export class GetPresignedUrlDto {
  filename: string;
  mimetype: string;
  userId: string;
}

export class GetPresignedUrlResponseDto {
  presignedUrl: string;
  key: string;
  bucketName: string;
}

export class GetPresignedUrlErrorResponseDto {
  message: string;
  statusCode: number;
}
