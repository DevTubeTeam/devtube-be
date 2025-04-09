import { Controller, Get, Post, Put, Delete, Body, Query  } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { VideoService } from './video.service';
import { Prisma } from '@prisma/client';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) { }


  // @Post('video_create')
  @MessagePattern('video_create')
  async create(@Body() data: {
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url: string;
    duration: number;
    user_id?: string;
    privacy?: 'public' | 'private' | 'unlisted';
    status?: 'processing' | 'ready' | 'failed';
  }) {
    return this.videoService.create(data); //
  }

  // FIND ONE
  // @Get('findOne')
  @MessagePattern('video_find_one')
  async findOne(@Query() query: { id: string }) {
    return this.videoService.findOne(query.id);
  }

  // FIND ALL
  // @Get('findAll')
  @MessagePattern('video_find_all')
  async findAll(@Query() query: {
    skip?: string;
    take?: string;
    user_id?: string;
    privacy?: 'public' | 'private' | 'unlisted';
    status?: 'processing' | 'ready' | 'failed';
    search?: string;
  }) {
    const parsedQuery = {
      ...query,
      skip: query.skip ? parseInt(query.skip) : undefined,
      take: query.take ? parseInt(query.take) : undefined,
    };
    return this.videoService.findAll(parsedQuery);
  }

  // UPDATE
  // @Put('update')
  @MessagePattern('video_update')
  async update(@Body() data: {
    id: string;
    updateData: {
      title?: string;
      description?: string;
      video_url?: string;
      thumbnail_url?: string;
      duration?: number;
      user_id?: string;
      privacy?: 'public' | 'private' | 'unlisted';
      status?: 'processing' | 'ready' | 'failed';
    };
  }) {
    return this.videoService.update(data.id, data.updateData);
  }

  // DELETE
  // @Delete('delete')
  @MessagePattern('video_delete')
  async remove(@Query() query: { id: string }) {
    return this.videoService.remove(query.id);
  }
}
