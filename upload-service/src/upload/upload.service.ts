import { awsRegion, bucketName, roleArn } from '@/config';
import {
  IGetPresignedUrl,
  IGetPresignedUrlResponse,
  ITemporaryCredential,
} from '@/upload/interfaces';
import { isMimeTypeAllowed } from '@/utils';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  AssumeRoleWithWebIdentityCommand,
  STSClient,
} from '@aws-sdk/client-sts';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  /**
   * Tạo presigned URL cho việc upload file lên S3
   *
   * 1. Nhận fileName, fileType và idToken từ client
   * 2. Kiểm tra fileType có hợp lệ không
   * 3. Lấy temporary credentials từ AWS STS bằng idToken
   * 4. Tạo S3 client với temporary credentials
   * 5. Tạo object key cho file upload
   * 6. Tạo presigned URL với S3 client, object key và fileType
   * 7. Trả về presigned URL, object key và bucketName cho client
   *
   * Lưu ý: URL được tạo ra có thời gian sống là 5 phút (300 giây)
   */
  async generatePresignedUrl(
    dto: IGetPresignedUrl,
  ): Promise<ServiceResponse<IGetPresignedUrlResponse>> {
    const { fileName, fileType, idToken } = dto;

    if (isMimeTypeAllowed(fileType)) {
      return {
        statusCode: 400,
        message: 'Invalid file type',
        data: null,
      };
    }

    try {
      const credentials = await this.getTemporaryCredentials(idToken);
      const s3Client = this.createS3Client(credentials);

      const key = this.generateObjectKey(fileName, 'userId');
      const url = await this.createPresignedUrl(s3Client, key, fileType);

      return {
        statusCode: 200,
        message: 'Presigned URL generated successfully',
        data: {
          presignedUrl: url,
          key,
          bucketName,
        },
      };
    } catch (error) {
      console.error('Failed to generate presigned URL', error);
      throw new InternalServerErrorException(
        'Could not generate presigned URL',
      );
    }
  }

  private async getTemporaryCredentials(
    idToken: string,
  ): Promise<ITemporaryCredential> {
    const stsClient = new STSClient({ region: awsRegion });

    const command = new AssumeRoleWithWebIdentityCommand({
      RoleArn: roleArn,
      RoleSessionName: 'web-identity-federation',
      WebIdentityToken: idToken,
    });

    const response = await stsClient.send(command);

    const creds = response.Credentials;
    if (!creds) {
      throw new Error('No credentials returned from STS');
    }

    return {
      accessKeyId: creds.AccessKeyId!,
      secretAccessKey: creds.SecretAccessKey!,
      sessionToken: creds.SessionToken!,
    };
  }

  private createS3Client(credentials: ITemporaryCredential): S3Client {
    return new S3Client({
      region: awsRegion,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
  }

  private generateObjectKey(fileName: string, userId: string): string {
    const uniqueId = uuidv4();
    return `uploads/${userId}/${uniqueId}`;
  }

  private async createPresignedUrl(
    s3Client: S3Client,
    key: string,
    fileType: string,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });

    return await getSignedUrl(s3Client, command, { expiresIn: 300 });
  }
}
