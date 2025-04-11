import { IGetPresignedUrl } from '@/upload/interfaces/get-presigned-url.interface';
import { UploadService } from '@/upload/upload.service';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @MessagePattern('get_presigned_url') // cũng nên sửa cho đồng bộ phía Gateway
  async getPresignedUrl(data: IGetPresignedUrl) {
    return await this.uploadService.generatePresignedUrl(data);
  }
}
