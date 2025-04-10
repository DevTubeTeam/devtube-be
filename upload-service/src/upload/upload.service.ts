import { bucketName, s3Client } from '@/config';
import {
  GetPresignedUrlDto,
  GetPresignedUrlResponseDto,
} from '@/upload/dto/get-presigned-url.dto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  async generatePresignedUrl(
    data: GetPresignedUrlDto,
  ): Promise<ServiceResponse<GetPresignedUrlResponseDto>> {
    const { filename, mimetype, userId } = data;

    const videoId = uuidv4();

    const key = `uploads/${userId}/${Date.now()}-${filename}`;

    const allowedMimeTypes = [
      'video/mp4',
      'video/avi',
      'video/mkv',
      'video/mov',
      'video/webm',
    ];

    if (!allowedMimeTypes.includes(mimetype)) {
      return {
        statusCode: 400,
        message: 'Invalid file type',
        data: null,
      };
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: mimetype,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return {
      statusCode: 200,
      message: 'Presigned URL generated successfully',
      data: { presignedUrl: url, key, bucketName },
    };
  }
}
