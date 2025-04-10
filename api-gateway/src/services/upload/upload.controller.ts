import { GetPresignedUrlDto } from '@/services/upload/dto/get-presigned-url.dto';
import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Controller('upload')
export class UploadController {
  constructor(
    @Inject('UPLOAD_SERVICE') private readonly uploadClient: ClientProxy
  ) {}

  @Post('presign')
  async getPresignedUrl(@Body() preSignedUrlDto: GetPresignedUrlDto) {
    return await lastValueFrom(
      this.uploadClient.send('get_presigned_url', preSignedUrlDto)
    );
  }
}
