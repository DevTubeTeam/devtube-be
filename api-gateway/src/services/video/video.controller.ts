import {
  Controller,
  Get,
  Inject,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { lastValueFrom } from 'rxjs';

@ApiTags('Video')
@Controller('video')
export class VideoController {
  constructor(
    @Inject('VIDEO_SERVICE') private readonly VideoClient: ClientProxy
  ) {}

  @Get('find-one')
  @ApiResponse({
    status: 200,
    description: 'Get video by id',
  })
  async findOneVideo(@Query('id') id: string) {
    console.log(id);
    
    return await lastValueFrom(
      this.VideoClient.send('video_find_one', { id })
    );
  }

}
