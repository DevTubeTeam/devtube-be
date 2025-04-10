import { Controller, Get, Post, Put, Delete, Body, Query } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { VideoService } from './video.service';
import { Prisma } from '@prisma/client';
import { CreateVideoRequest } from './requests/create-video.request';
import { FindAllVideoRequest  } from './requests/find-all-video.request';
import { UpdateVideoRequest  } from './requests/update-video.request';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) { }


  // CREATE
  @MessagePattern('video_create')
  async create(@Body() data: CreateVideoRequest) {
    return this.videoService.create(data);
  }

  @MessagePattern('video_find_one')
  async findOne(@Body() data: { id: string }) {
    return this.videoService.findOne(data.id);
  }

  // FIND ALL
  @MessagePattern('video_find_all')
  async findAll(@Body() data: FindAllVideoRequest) {
    const parsedQuery = {
      ...data,
      skip: data.skip ? parseInt(data.skip as any) : undefined,
      take: data.take ? parseInt(data.take as any) : undefined,
    };
    return this.videoService.findAll(parsedQuery);
  }

  // UPDATE
  @MessagePattern('video_update')
  async update(@Body() data: UpdateVideoRequest) {
    return this.videoService.update(data);
  }

  // DELETE
  // @Delete('delete')
  @MessagePattern('video_delete')
  async remove(@Body() data: { id: string }) {
    return this.videoService.remove(data.id);
  }
}
