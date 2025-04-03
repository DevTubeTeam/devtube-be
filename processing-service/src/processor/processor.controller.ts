import { Controller } from '@nestjs/common';
import { ProcessorService } from './processor.service';

@Controller('video')
export class ProcessorController {
  constructor(private readonly videoService: ProcessorService) {}
}
