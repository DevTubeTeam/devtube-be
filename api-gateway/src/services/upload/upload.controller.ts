import { CompleteMultipartUploadDto } from '@/services/upload/dto/complete-multipart-upload.dto';
import { GetPresignedUrlDto } from '@/services/upload/dto/get-presigned-url.dto';
import { LoggerService } from '@/shared/utils/logger.service';
import { Body, Controller, Inject, Post, ValidationPipe } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { lastValueFrom } from 'rxjs';

@Controller('upload')
export class UploadController {
  constructor(
    @Inject('UPLOAD_SERVICE') private readonly uploadClient: ClientProxy,
    private readonly logger: LoggerService
  ) {}

  @ApiOperation({ summary: 'Verify Google ID token' })
  @Post('presign-url')
  async getPresignedUrl(
    @Body(new ValidationPipe({ transform: true }))
    preSignedUrlDto: GetPresignedUrlDto
  ): Promise<ServiceResponse<any>> {
    try {
      const result = await lastValueFrom(
        this.uploadClient.send('get_presigned_url', preSignedUrlDto)
      );
      return result;
    } catch (error) {
      return {
        statusCode: 500,
        message: 'Internal server error',
        data: null,
      };
    }
  }

  @ApiOperation({ summary: 'Complete multipart file upload' })
  @ApiResponse({
    status: 200,
    description: 'Multipart upload completed successfully',
  })
  @Post('complete-multipart-upload')
  async completeMultipartUpload(
    @Body(new ValidationPipe({ transform: true }))
    completeMultipartDto: CompleteMultipartUploadDto
  ): Promise<ServiceResponse<null>> {
    this.logger.log('Received request for complete_multipart_upload', {
      key: completeMultipartDto.key,
    });

    try {
      const result = await lastValueFrom(
        this.uploadClient.send(
          'complete_multipart_upload',
          completeMultipartDto
        )
      );
      this.logger.log('Successfully processed complete_multipart_upload', {
        statusCode: result.statusCode,
      });

      return {
        statusCode: 200,
        message: 'Multipart upload completed successfully',
        data: null,
      };
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
}
