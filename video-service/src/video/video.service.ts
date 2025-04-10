import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { transformBigInt } from '@/utils/transformBigInt';
import { CreateVideoDto } from './dto/create-video.dto';
import { FindAllVideoDto } from './dto/find-all-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';

@Injectable()
export class VideoService {
  constructor(
    private readonly prismaService: PrismaService, // Inject PrismaService vào AuthService
  ) { }

  async create(data: CreateVideoDto) {
    const video = await this.prismaService.videos.create({ data });
    return transformBigInt(video);
  }

  // FIND ONE
  async findOne(id: string) {
    const existing = await this.prismaService.videos.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Video with id ${id} not found`);
    }
    const video = await this.prismaService.videos.findUnique({ where: { id } });
    return transformBigInt(video);
  }

  // FIND ALL
  async findAll(query: FindAllVideoDto) {
    const { skip = 0, take = 10, user_id, privacy, status, search } = query;

    const videos = await this.prismaService.videos.findMany({
      where: {
        user_id,
        privacy,
        status,
        OR: search
          ? [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
          : undefined,
      },
      skip,
      take,
      orderBy: { created_at: 'desc' },
    });

    return transformBigInt(videos);
  }

  // UPDATE
  async update(data: UpdateVideoDto) {
    const { id, updateData } = data;

    const existing = await this.prismaService.videos.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Video with id ${id} not found`);
    }

    const updatedVideo = await this.prismaService.videos.update({
      where: { id },
      data: updateData,
    });

    return transformBigInt(updatedVideo);
  }

  // DELETE
  async remove(id: string) {
    const existing = await this.prismaService.videos.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Video with id ${id} not found`);
    }
    const video = await this.prismaService.videos.delete({
      where: { id },
    });
    return transformBigInt(video);
  }

}
