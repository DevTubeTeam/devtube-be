import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class VideoService {
  constructor(
    private readonly prismaService: PrismaService, // Inject PrismaService vào AuthService
  ) {}
}
