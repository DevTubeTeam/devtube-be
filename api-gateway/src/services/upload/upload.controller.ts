import { CompleteMultipartUploadDto } from '@/services/upload/dto/complete-multipart-upload.dto';
import { GetPresignedUrlDto } from '@/services/upload/dto/get-presigned-url.dto';
import { LoggerService } from '@/shared/utils/logger.service';
import { Body, Controller, HttpStatus, Inject, Post, ValidationPipe } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { lastValueFrom } from 'rxjs';
import { AbortMultipartUploadDto, DeleteFileDto } from './dto/undo-upload.dto';

@Controller('upload')
export class UploadController {
  constructor(
    @Inject('UPLOAD_SERVICE') private readonly uploadClient: ClientProxy,
    private readonly logger: LoggerService
  ) { }

  @ApiOperation({ summary: 'Get presigned URL for file upload' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Presigned URL generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
  })
  @Post('presign-url')
  async getPresignedUrl(@Body(new ValidationPipe({ transform: true })) preSignedUrlDto: GetPresignedUrlDto): Promise<ServiceResponse<any>> {
    try {
      this.logger.log('Processing presigned URL request', { dto: preSignedUrlDto });
      return await lastValueFrom(
        this.uploadClient.send('get_presigned_url', preSignedUrlDto)
      );
    } catch (error) {
      this.logger.error('Failed to generate presigned URL', { error });
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        data: null,
      };
    }
  }

  @ApiOperation({ summary: 'Complete multipart file upload' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Multipart upload completed successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
  })
  @Post('complete-multipart-upload')
  async completeMultipartUpload(@Body(new ValidationPipe({ transform: true })) completeMultipartDto: CompleteMultipartUploadDto): Promise<ServiceResponse<null>> {
    this.logger.log('Processing complete multipart upload request', {
      key: completeMultipartDto.key,
    });

    try {
      const result = await lastValueFrom(
        this.uploadClient.send(
          'complete_multipart_upload',
          completeMultipartDto
        )
      );
      this.logger.log('Successfully completed multipart upload', {
        statusCode: result.statusCode,
        key: completeMultipartDto.key,
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Multipart upload completed successfully',
        data: null,
      };
    } catch (error) {
      this.logger.error('Failed to complete multipart upload', {
        error,
        key: completeMultipartDto.key,
      });

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        data: null,
      };
    }
  }

  @ApiOperation({ summary: 'Abort multipart file upload' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Multipart upload aborted successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
  })
  @Post('abort-multipart-upload')
  async abortMultipartUpload(@Body(new ValidationPipe({ transform: true })) abortMultipartDto: AbortMultipartUploadDto): Promise<ServiceResponse<null>> {
    this.logger.log('Processing abort multipart upload request', {
      key: abortMultipartDto.key,
    });

    try {
      const result = await lastValueFrom(
        this.uploadClient.send(
          'abort_multipart_upload',
          abortMultipartDto
        )
      );
      this.logger.log('Successfully aborted multipart upload', {
        statusCode: result.statusCode,
        key: abortMultipartDto.key,
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'Multipart upload aborted successfully',
        data: null,
      };
    } catch (error) {
      this.logger.error('Failed to abort multipart upload', {
        error,
        key: abortMultipartDto.key,
      });

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        data: null,
      };
    }
  }

  @ApiOperation({ summary: 'Delete file from S3' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'File deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
  })
  @Post('delete-file')
  async deleteFile(@Body(new ValidationPipe({ transform: true })) deleteFileDto: DeleteFileDto): Promise<ServiceResponse<null>> {
    this.logger.log('Processing delete file request', {
      key: deleteFileDto.key,
    });

    try {
      const result = await lastValueFrom(
        this.uploadClient.send('delete_file', deleteFileDto)
      );
      this.logger.log('Successfully deleted file', {
        statusCode: result.statusCode,
        key: deleteFileDto.key,
      });

      return {
        statusCode: HttpStatus.OK,
        message: 'File deleted successfully',
        data: null,
      };
    } catch (error) {
      this.logger.error('Failed to delete file', {
        error,
        key: deleteFileDto.key,
      });

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        data: null,
      };
    }
  }
}
