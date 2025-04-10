import { Controller, Get, Post, Put, Delete, Body, Query } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { VideoService } from './video.service';
import { Prisma } from '@prisma/client';
import { CreateVideoDto } from './dto/create-video.dto';
import { FindAllVideoDto } from './dto/find-all-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';

@Controller('video')
export class VideoController {
  constructor(private readonly videoService: VideoService) { }


  // CREATE
  @MessagePattern('video_create')
  @MessagePattern('video_create')
  async create(@Body() data: CreateVideoDto) {
    return this.videoService.create(data);
  }

  @MessagePattern('video_find_one')
  async findOne(@Body() data: { id: string }) {
    return this.videoService.findOne(data.id);
  }

  // FIND ALL
  @MessagePattern('video_find_all')
  async findAll(@Body() data: FindAllVideoDto) {
    const parsedQuery = {
      ...data,
      skip: data.skip ? parseInt(data.skip as any) : undefined,
      take: data.take ? parseInt(data.take as any) : undefined,
    };
    return this.videoService.findAll(parsedQuery);
  }

  // UPDATE
  @MessagePattern('video_update')
  async update(@Body() data: UpdateVideoDto) {
    return this.videoService.update(data);
  }

  // DELETE
  // @Delete('delete')
  @MessagePattern('video_delete')
  async remove(@Body() data: { id: string }) {
    return this.videoService.remove(data.id);
  }
}
