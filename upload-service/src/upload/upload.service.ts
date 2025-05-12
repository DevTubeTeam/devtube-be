import { IAbortMultipartUploadRequest, IDeleteObjectDataRequest, IMultipartPresignedUrlResponse, IPresignedUrlRequest, ISinglePresignedUrlResponse, ITemporaryCredential } from '@/upload/interfaces';
import { isMimeTypeAllowed } from '@/utils';
import { LoggerService } from '@/utils/logger.service';
import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand, DeleteObjectCommand, PutObjectCommand, S3Client, UploadPartCommand } from '@aws-sdk/client-s3';
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
   * Generates a presigned URL for uploading a file to S3.
   * @param dto - The request data containing file details and user token.
   * @returns A service response with the presigned URL or an error message.
   */
  async generatePresignedUrl(dto: IPresignedUrlRequest): Promise<ServiceResponse<ISinglePresignedUrlResponse | IMultipartPresignedUrlResponse>> {
    const { fileName, fileType, idToken, fileSize } = dto;

    this.logger.log(`Generating presigned URL for ${fileName}`);

    await this.verifyIdToken(idToken);

    if (!isMimeTypeAllowed(fileType)) {
      return this.errorResponse(400, 'Invalid file type');
    }

    if (fileSize <= 0) {
      return this.errorResponse(400, 'File size must be positive');
    }

    try {
      // const userId = this.getUserIdFromToken(idToken);
      const userId = dto.userId;
      const credentials = await this.getTemporaryCredentials(idToken);
      const s3Client = this.createS3Client(credentials);
      const key = this.generateObjectKey(userId);

      return fileSize <= this.MULTIPART_THRESHOLD
        ? await this.generateSinglePresignedUrl(s3Client, key, fileType, fileName, userId)
        : await this.handleMultipartUpload(s3Client, key, fileType, fileName, userId, fileSize);
    } catch (error) {
      return this.handleError(error, error.message);
    }
  }

  /**
   * Handles the multipart upload process by generating presigned URLs for each part.
   * @param s3Client - The S3 client instance.
   * @param key - The S3 object key.
   * @param fileType - The MIME type of the file.
   * @param fileName - The original file name.
   * @param userId - The ID of the user uploading the file.
   * @param fileSize - The size of the file.
   * @returns A service response with multipart presigned URLs or an error message.
   */
  private async handleMultipartUpload(s3Client: S3Client, key: string, fileType: string, fileName: string, userId: string, fileSize: number) {
    const partCount = Math.ceil(fileSize / this.PART_SIZE);
    if (partCount > 10000) {
      const maxFileSizeInGB = ((this.PART_SIZE * 10000) / (1024 * 1024 * 1024)).toFixed(2);
      return this.errorResponse(400, `File too large, exceeds part count limit. Maximum allowed file size is ${maxFileSizeInGB} GB`);
    }
    return await this.generateMultipartPresignedUrls(s3Client, key, fileType, fileName, userId, partCount);
  }

  /**
   * Completes a multipart upload by sending a request to S3 with the parts information.
   * @param dto - The request data containing upload details and user token.
   * @returns A service response indicating success or failure.
   */
  async completeMultipartUpload(dto: { key: string; uploadId: string; parts: { ETag: string; PartNumber: number }[]; idToken: string; }): Promise<ServiceResponse<null>> {
    const { key, uploadId, parts, idToken } = dto;
    this.logger.log(`Completing multipart upload for key: ${key}`);

    await this.verifyIdToken(idToken);

    if (!parts.length || parts.some((p) => p.PartNumber < 1 || !p.ETag)) {
      return this.errorResponse(400, 'Invalid parts data');
    }

    try {
      const credentials = await this.getTemporaryCredentials(idToken);
      const s3Client = this.createS3Client(credentials);

      this.logger.log(`Sending CompleteMultipartUploadCommand to S3 for key: ${key}`, {
        bucket: this.bucketName,
        uploadId,
        partsCount: parts.length
      });

      const sortedParts = parts
        .slice()
        .sort((a, b) => a.PartNumber - b.PartNumber);

      const result = await s3Client.send(new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: sortedParts },
      }));

      this.logger.log("CompleteMultipartUploadCommand sent to S3", result);

      this.logger.log(`S3 CompleteMultipartUpload successful for key: ${key}`, {
        eTag: result.ETag,
        location: result.Location
      });

      return this.successResponse(200, 'Multipart upload completed successfully', null);
    } catch (error: any) {
      this.logger.error('S3 CompleteMultipartUpload FAILED:', {
        message: error.message,
        code: error.code,
        name: error.name,
        metadata: error.$metadata,
        stack: error.stack
      });
      return this.handleError(error, 'Failed to complete multipart upload');
    }
  }

  /**
   * Aborts a multipart upload by sending a request to S3.
   * @param dto - The request data containing upload details and user token.
   * @returns A service response indicating success or failure.
   */
  async abortMultipartUpload(dto: IAbortMultipartUploadRequest): Promise<ServiceResponse<null>> {
    const { key, uploadId, idToken } = dto;
    this.logger.log(`Aborting multipart upload for key: ${key}`);

    await this.verifyIdToken(idToken);

    try {
      const credentials = await this.getTemporaryCredentials(idToken);
      const s3Client = this.createS3Client(credentials);

      await s3Client.send(new AbortMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
      }));

      return this.successResponse(200, 'Multipart upload aborted successfully', null);
    } catch (error) {
      return this.handleError(error, error.message);
    }
  }

  /**
   * Deletes an object from S3.
   * @param dto - The request data containing object details and user token.
   * @returns A service response indicating success or failure.
   */
  async deleteObject(dto: IDeleteObjectDataRequest): Promise<ServiceResponse<null>> {
    const { key, idToken } = dto;
    this.logger.log(`Deleting object for key: ${key}`);

    await this.verifyIdToken(idToken);

    try {
      const credentials = await this.getTemporaryCredentials(idToken);
      const s3Client = this.createS3Client(credentials);

      await s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));

      return this.successResponse(200, 'Object deleted successfully', null);
    } catch (error) {
      return this.handleError(error, error.message);
    }
  }

  /**
   * Verifies the ID token by sending it to the authentication service.
   * @param idToken - The ID token to verify.
   * @returns The user data if the token is valid.
   * @throws UnauthorizedException if the token is invalid or verification fails.
   */
  private async verifyIdToken(idToken: string): Promise<any> {
    try {
      const authResult = await lastValueFrom(this.authClient.send('auth_verify_id_token', { idToken }));

      if (authResult.statusCode !== 200 || !authResult.data?.user) {
        throw new UnauthorizedException('Invalid idToken');
      }

      return authResult.data.user;
    } catch (error) {
      throw new UnauthorizedException('Failed to verify idToken');
    }
  }

  /**
   * Retrieves temporary AWS credentials using the ID token.
   * @param idToken - The ID token for authentication.
   * @returns The temporary AWS credentials.
   * @throws Error if the credentials cannot be retrieved.
   */
  private async getTemporaryCredentials(idToken: string): Promise<ITemporaryCredential> {
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
      throw error;
    }
  }

  /**
   * Creates an S3 client using the provided temporary credentials.
   * @param credentials - The temporary AWS credentials.
   * @returns An instance of S3Client.
   */
  private createS3Client(credentials: ITemporaryCredential): S3Client {
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
   * Extracts the user ID from the ID token.
   * @param idToken - The ID token containing user information.
   * @returns The user ID or 'anonymous' if not found.
   */
  private getUserIdFromToken(idToken: string): string {
    try {
      const decoded = decode(idToken) as { sub?: string };
      return decoded?.sub || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  /**
   * Generates a unique S3 object key for the uploaded file.
   * @param userId - The ID of the user uploading the file.
   * @returns A unique object key.
   */
  private generateObjectKey(userId: string): string {
    return `uploads/${uuidv4()}`;
  }

  /**
   * Generates a presigned URL for a single file upload.
   * @param s3Client - The S3 client instance.
   * @param key - The S3 object key.
   * @param fileType - The MIME type of the file.
   * @param fileName - The original file name.
   * @param userId - The ID of the user uploading the file.
   * @returns A service response with the presigned URL.
   */
  private async generateSinglePresignedUrl(
    s3Client: S3Client,
    key: string,
    fileType: string,
    fileName: string,
    userId: string,
  ): Promise<ServiceResponse<ISinglePresignedUrlResponse>> {
    this.logger.log(`Generating presigned URL for single file upload: ${userId}, ${fileName}, ${fileType}, ${key}`);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: fileType,
      // Metadata: {
      //   'original-name': fileName,
      //   'uploaded-by': userId,
      // },
      // ContentDisposition: `attachment; filename="${fileName}"`,
    });

    this.logger.log(`Generating presigned URL for ${fileName}`);

    // Generate presigned URL without specifying signableHeaders to let AWS SDK handle it properly
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: this.PRESIGNED_URL_EXPIRY
    });

    this.logger.log('Presigned URL generated successfully');

    // Return the response with the URL and other necessary information
    return this.successResponse(200, 'Presigned URL generated successfully', {
      presignedUrl: url,
      key,
      bucketName: this.bucketName
    });
  }

  /**
   * Generates presigned URLs for each part of a multipart upload.
   * @param s3Client - The S3 client instance.
   * @param key - The S3 object key.
   * @param fileType - The MIME type of the file.
   * @param fileName - The original file name.
   * @param userId - The ID of the user uploading the file.
   * @param partCount - The number of parts in the upload.
   * @returns A service response with multipart presigned URLs.
   */
  private async generateMultipartPresignedUrls(
    s3Client: S3Client,
    key: string,
    fileType: string,
    fileName: string,
    userId: string,
    partCount: number,
  ): Promise<ServiceResponse<IMultipartPresignedUrlResponse>> {
    const { UploadId } = await s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: fileType,
        // Metadata: {
        //   'original-name': fileName,
        //   'uploaded-by': userId,
        // },
        // ContentDisposition: `attachment; filename="${fileName}"`,
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

    return this.successResponse(200, 'Multipart presigned URLs generated successfully', {
      uploadId: UploadId!,
      key,
      bucketName: this.bucketName,
      presignedUrls,
    });
  }

  /**
   * Constructs a successful service response.
   * @param statusCode - The HTTP status code.
   * @param message - The response message.
   * @param data - The response data.
   * @returns A service response object.
   */
  private successResponse(statusCode: number, message: string, data: any): ServiceResponse<any> {
    return { statusCode, message, data };
  }

  /**
   * Constructs an error service response.
   * @param statusCode - The HTTP status code.
   * @param message - The error message.
   * @returns A service response object with null data.
   */
  private errorResponse(statusCode: number, message: string): ServiceResponse<null> {
    return { statusCode, message, data: null };
  }

  /**
   * Handles errors and constructs an appropriate service response.
   * @param error - The error object.
   * @param defaultMessage - The default error message.
   * @returns A service response object with an error message.
   */
  private handleError(error: any, defaultMessage: string): ServiceResponse<null> {
    if (error.name === 'STSServiceException') {
      return this.errorResponse(403, 'Failed to authenticate with STS');
    }
    return this.errorResponse(500, defaultMessage);
  }
}
