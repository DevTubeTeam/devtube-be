import { IMultipartPresignedUrlResponse, IPresignedUrlRequest, ISinglePresignedUrlResponse, ITemporaryCredential } from '@/upload/interfaces';
import { isMimeTypeAllowed } from '@/utils';
import { LoggerService } from '@/utils/logger.service';
import { CompleteMultipartUploadCommand, CreateMultipartUploadCommand, PutObjectCommand, S3Client, UploadPartCommand } from '@aws-sdk/client-s3';
import { AssumeRoleWithWebIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { decode } from 'jsonwebtoken';
import { lastValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100MB
  private readonly PART_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly PRESIGNED_URL_EXPIRY = 3600; // 1 hour
  private readonly awsRegion: string;
  private readonly bucketName: string;
  private readonly roleArn: string;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {
    this.awsRegion = this.configService.get<string>('awsConfig.awsRegion')!;
    this.bucketName = this.configService.get<string>('awsConfig.bucketName')!;
    this.roleArn = this.configService.get<string>('awsConfig.roleArn')!;
  }

  /**
   * Tạo URL ký sẵn để tải tệp lên S3, hỗ trợ cả tải đơn (single upload) và tải nhiều phần (multipart upload).
   * @param dto - Dữ liệu yêu cầu chứa fileName, fileType, idToken, và fileSize.
   * @returns ServiceResponse chứa URL ký sẵn hoặc thông báo lỗi.
   * @throws UnauthorizedException nếu idToken không hợp lệ.
   * @throws Error nếu thao tác với S3 hoặc STS thất bại.
   */
  async generatePresignedUrl(dto: IPresignedUrlRequest): Promise<ServiceResponse<ISinglePresignedUrlResponse | IMultipartPresignedUrlResponse>> {
    const { fileName, fileType, idToken, fileSize } = dto;

    this.logger.log(`Generating presigned URL for ${fileName}`);

    // Xác thực idToken
    await this.verifyIdToken(idToken);

    // Kiểm tra MIME type
    if (!isMimeTypeAllowed(fileType)) {
      this.logger.warn(`Invalid MIME type: ${fileType}`);
      return this.errorResponse(400, 'Invalid file type');
    }

    // Validate fileSize
    if (fileSize <= 0) {
      this.logger.warn(`Invalid file size: ${fileSize}`);
      return this.errorResponse(400, 'File size must be positive');
    }

    try {
      const userId = this.getUserIdFromToken(idToken);
      const credentials = await this.getTemporaryCredentials(idToken);
      const s3Client = this.createS3Client(credentials);
      const key = this.generateObjectKey(userId);

      if (fileSize <= this.MULTIPART_THRESHOLD) {
        return await this.generateSinglePresignedUrl(s3Client, key, fileType, fileName, userId);
      } else {
        const partCount = Math.ceil(fileSize / this.PART_SIZE);
        if (partCount > 10000) {
          const maxFileSize = this.PART_SIZE * 10000; // Maximum file size in bytes
          const maxFileSizeInGB = (maxFileSize / (1024 * 1024 * 1024)).toFixed(2); // Convert to GB
          return this.errorResponse(400, `File too large, exceeds part count limit. Maximum allowed file size is ${maxFileSizeInGB} GB`);
        }
        return await this.generateMultipartPresignedUrls(s3Client, key, fileType, fileName, userId, partCount);
      }
    } catch (error) {
      return this.handleError(error, 'Failed to generate presigned URL');
    }
  }

  /**
   * Hoàn tất quá trình tải tệp nhiều phần lên S3 bằng cách kết hợp các phần đã tải.
   * @param dto - Dữ liệu yêu cầu chứa key, uploadId, parts, và idToken.
   * @returns ServiceResponse cho biết thành công hoặc thông báo lỗi.
   * @throws UnauthorizedException nếu idToken không hợp lệ.
   * @throws Error nếu thao tác với S3 thất bại.
   */
  async completeMultipartUpload(dto: {
    key: string;
    uploadId: string;
    parts: { ETag: string; PartNumber: number }[];
    idToken: string;
  }): Promise<ServiceResponse<null>> {
    const { key, uploadId, parts, idToken } = dto;
    this.logger.log(`Completing multipart upload for key: ${key}`);

    // Validate idToken
    await this.verifyIdToken(idToken);

    // Validate parts
    if (!parts.length || parts.some((p) => p.PartNumber < 1 || !p.ETag)) {
      this.logger.warn('Invalid parts data', { parts });
      return this.errorResponse(400, 'Invalid parts data');
    }

    try {
      const credentials = await this.getTemporaryCredentials(idToken);
      const s3Client = this.createS3Client(credentials);

      await s3Client.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.bucketName,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: parts },
        }),
      );

      this.logger.log(`Multipart upload completed for key: ${key}`);
      return {
        statusCode: 200,
        message: 'Multipart upload completed successfully',
        data: null,
      };
    } catch (error) {
      return this.handleError(error, 'Failed to complete multipart upload');
    }
  }

  /**
   * Xác thực idToken bằng cách gọi auth-service.
   * @param idToken - Token JWT cần xác thực.
   * @returns Dữ liệu người dùng từ auth-service.
   * @throws UnauthorizedException nếu xác thực thất bại.
   */
  private async verifyIdToken(idToken: string): Promise<any> {
    try {
      const authResult = await lastValueFrom(this.authClient.send('auth_verify_id_token', { idToken }));

      this.logger.log('Auth result from auth-service', { authResult });

      if (authResult.statusCode !== 200 || !authResult.data?.user) {
        this.logger.error('Invalid idToken response from auth-service', { authResult });
        throw new UnauthorizedException('Invalid idToken');
      }

      return authResult.data.user;
    } catch (error) {
      this.logger.error('Failed to verify idToken', { error });
      throw new UnauthorizedException('Failed to verify idToken');
    }
  }

  /**
   * Lấy thông tin xác thực tạm thời từ AWS STS bằng idToken.
   * @param idToken - Token JWT dùng để xác thực.
   * @returns Thông tin xác thực tạm thời (accessKeyId, secretAccessKey, sessionToken).
   * @throws Error nếu yêu cầu STS thất bại.
   */
  private async getTemporaryCredentials(idToken: string): Promise<ITemporaryCredential> {
    this.logger.log('Fetching temporary credentials from STS');

    const stsClient = new STSClient({ region: this.awsRegion });
    const command = new AssumeRoleWithWebIdentityCommand({
      RoleArn: this.roleArn,
      RoleSessionName: 'web-identity-federation',
      WebIdentityToken: idToken,
    });

    try {
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
    } catch (error) {
      this.logger.error('Failed to fetch STS credentials', { error });
      throw error;
    }
  }

  /**
   * Tạo một instance của S3 client với thông tin xác thực cung cấp.
   * @param credentials - Thông tin xác thực tạm thời của AWS.
   * @returns Một instance của S3Client.
   */
  private createS3Client(credentials: ITemporaryCredential): S3Client {
    this.logger.log('Creating S3 client');
    return new S3Client({
      region: this.awsRegion,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken,
      },
    });
  }

  /**
   * Trích xuất ID người dùng từ idToken cung cấp.
   * @param idToken - Token JWT cần giải mã.
   * @returns ID người dùng (sub) hoặc 'anonymous' nếu giải mã thất bại.
   */
  private getUserIdFromToken(idToken: string): string {
    this.logger.log('Decoding idToken to extract userId');
    try {
      const decoded = decode(idToken) as { sub?: string };
      return decoded?.sub || 'anonymous';
    } catch (error) {
      this.logger.error('Failed to decode idToken', { error });
      return 'anonymous';
    }
  }

  /**
   * Tạo một key đối tượng S3 duy nhất cho tệp.
   * @param userId - ID của người dùng tải tệp lên.
   * @returns Key đối tượng duy nhất theo định dạng `Uploads/{userId}/{uuid}`.
   */
  private generateObjectKey(userId: string): string {
    const uniqueId = uuidv4();
    this.logger.log('Generated object key', { userId, uniqueId });
    return `uploads/${userId}/${uniqueId}`;
  }

  /**
   * Tạo URL ký sẵn cho việc tải tệp đơn lên S3.
   * @param s3Client - Instance của S3 client.
   * @param key - Key đối tượng S3.
   * @param fileType - Kiểu MIME của tệp.
   * @param fileName - Tên gốc của tệp.
   * @param userId - ID của người dùng tải tệp lên.
   * @returns ServiceResponse chứa URL ký sẵn.
   */
  private async generateSinglePresignedUrl(
    s3Client: S3Client,
    key: string,
    fileType: string,
    fileName: string,
    userId: string,
  ): Promise<ServiceResponse<ISinglePresignedUrlResponse>> {
    this.logger.log('Generating single presigned URL', { key, fileType });

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: fileType,
      Metadata: {
        'original-name': fileName,
        'uploaded-by': userId,
      },
      ContentDisposition: `attachment; filename="${fileName}"`,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: this.PRESIGNED_URL_EXPIRY });
    this.logger.log('Single presigned URL generated', { url });

    return {
      statusCode: 200,
      message: 'Presigned URL generated successfully',
      data: { presignedUrl: url, key, bucketName: this.bucketName },
    };
  }

  /**
   * Tạo các URL ký sẵn cho việc tải tệp nhiều phần lên S3.
   * @param s3Client - Instance của S3 client.
   * @param key - Key đối tượng S3.
   * @param fileType - Kiểu MIME của tệp.
   * @param fileName - Tên gốc của tệp.
   * @param userId - ID của người dùng tải tệp lên.
   * @param partCount - Số lượng phần của quá trình tải nhiều phần.
   * @returns ServiceResponse chứa chi tiết tải nhiều phần.
   */
  private async generateMultipartPresignedUrls(
    s3Client: S3Client,
    key: string,
    fileType: string,
    fileName: string,
    userId: string,
    partCount: number,
  ): Promise<ServiceResponse<IMultipartPresignedUrlResponse>> {
    this.logger.log('Generating multipart presigned URLs', { key, partCount });

    const { UploadId } = await s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: fileType,
        Metadata: {
          'original-name': fileName,
          'uploaded-by': userId,
        },
        ContentDisposition: `attachment; filename="${fileName}"`,
      }),
    );

    const presignedUrls = await Promise.all(
      Array.from({ length: partCount }, async (_, i) => {
        const partNumber = i + 1;
        const command = new UploadPartCommand({
          Bucket: this.bucketName,
          Key: key,
          UploadId,
          PartNumber: partNumber,
        });
        return getSignedUrl(s3Client, command, { expiresIn: this.PRESIGNED_URL_EXPIRY });
      }),
    );

    this.logger.log(`Generated ${partCount} multipart URLs`, { key });
    return {
      statusCode: 200,
      message: 'Multipart presigned URLs generated successfully',
      data: {
        uploadId: UploadId!,
        key,
        bucketName: this.bucketName,
        presignedUrls,
      },
    };
  }

  /**
   * Tạo phản hồi lỗi với mã trạng thái và thông điệp được chỉ định.
   * @param statusCode - Mã trạng thái HTTP.
   * @param message - Thông điệp lỗi.
   * @returns ServiceResponse chứa chi tiết lỗi.
   */
  private errorResponse(statusCode: number, message: string): ServiceResponse<null> {
    return { statusCode, message, data: null };
  }

  /**
   * Xử lý lỗi và trả về phản hồi lỗi chuẩn hóa.
   * @param error - Đối tượng lỗi.
   * @param defaultMessage - Thông điệp lỗi mặc định.
   * @returns ServiceResponse chứa chi tiết lỗi.
   */
  private handleError(error: any, defaultMessage: string): ServiceResponse<null> {
    this.logger.error(defaultMessage, { error });
    if (error.name === 'STSServiceException') {
      return this.errorResponse(403, 'Failed to authenticate with STS');
    }
    return this.errorResponse(500, defaultMessage);
  }
}
