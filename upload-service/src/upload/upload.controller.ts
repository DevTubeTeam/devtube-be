import {
  IAbortMultipartUploadRequest,
  ICompleteMultipartUploadRequest,
  IDeleteObjectDataRequest,
  IMultipartPresignedUrlResponse,
  IPresignedUrlRequest,
  ISinglePresignedUrlResponse,
} from '@/upload/interfaces';
import { UploadService } from '@/upload/upload.service';
import { LoggerService } from '@/utils/logger.service';
import { BadRequestException, Controller, Inject } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';


@Controller()
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    @Inject(LoggerService) private readonly logger: LoggerService,
  ) { }

  @MessagePattern('get_presigned_url')
  async getPresignedUrl(
    data: IPresignedUrlRequest,
  ): Promise<
    ServiceResponse<
      ISinglePresignedUrlResponse | IMultipartPresignedUrlResponse
    >
  > {
    this.logger.log('Received request for get_presigned_url', { data });

    if (!data.fileName || !data.fileType || !data.idToken || !data.fileSize) {
      this.logger.warn('Invalid input for get_presigned_url', { data });
      throw new BadRequestException(
        'Missing required fields: fileName, fileType, idToken, or fileSize',
      );
    }

    try {
      const result = await this.uploadService.generatePresignedUrl(data);
      this.logger.log('Successfully processed get_presigned_url', {
        statusCode: result.statusCode,
      });
      return result;
    } catch (error) {
      this.logger.error('Failed to process get_presigned_url', { error });
      return {
        statusCode: 500,
        message: 'Internal server error',
        data: null,
      };
    }
  }

  @MessagePattern('complete_multipart_upload')
  async completeMultipartUpload(
    data: ICompleteMultipartUploadRequest,
  ): Promise<ServiceResponse<null>> {
    this.logger.log('Received request for complete_multipart_upload', {
      key: data.key,
    });

    // Kiểm tra input cơ bản
    if (
      !data.key ||
      !data.uploadId ||
      !data.parts ||
      !data.idToken ||
      !Array.isArray(data.parts)
    ) {
      this.logger.warn('Invalid input for complete_multipart_upload', { data });
      throw new BadRequestException(
        'Missing required fields: key, uploadId, parts, or idToken',
      );
    }

    try {
      const result = await this.uploadService.completeMultipartUpload(data);
      this.logger.log('Successfully processed complete_multipart_upload', {
        statusCode: result.statusCode,
      });
      return result;
    } catch (error) {
      this.logger.error('Failed to process complete_multipart_upload', {
        error,
      });
      return {
        statusCode: 500,
        message: 'Internal server error',
        data: null,
      };
    }
  }

  @MessagePattern('abort_multipart_upload')
  async abortMultipartUpload(data: IAbortMultipartUploadRequest): Promise<ServiceResponse<null>> {
    this.logger.log('Received request for abort_multipart_upload', { key: data.key });

    if (!data.key || !data.uploadId || !data.idToken) {
      this.logger.warn('Invalid input for abort_multipart_upload', { data });
      throw new BadRequestException('Missing required fields: key, uploadId, or idToken');
    }

    try {
      const result = await this.uploadService.abortMultipartUpload(data);
      this.logger.log('Successfully processed abort_multipart_upload', {
        statusCode: result.statusCode,
      });
      return result;
    } catch (error) {
      this.logger.error('Failed to process abort_multipart_upload', { error });
      return {
        statusCode: 500,
        message: error.message,
        data: null,
      };
    }
  }

  @MessagePattern('delete_object')
  async deleteObject(data: IDeleteObjectDataRequest): Promise<ServiceResponse<null>> {
    this.logger.log('Received request for delete_object', { key: data.key });

    if (!data.key || !data.idToken) {
      this.logger.warn('Invalid input for delete_object', { data });
      throw new BadRequestException('Missing required fields: key or idToken');
    }

    try {
      const result = await this.uploadService.deleteObject(data);
      this.logger.log('Successfully processed delete_object', {
        statusCode: result.statusCode,
      });
      return result;  
    }
    catch (error) {
      this.logger.error('Failed to process delete_object', { error });
      return {
        statusCode: 500,
        message: error.message,
        data: null,
      };
    }
  }
}
