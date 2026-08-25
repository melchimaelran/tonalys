import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const job = await this.prismaService.analysisJob.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return {
      id: job.id,
      trackId: job.trackId,
      status: job.status,
      errorMessage: job.errorMessage,
    };
  }
}
