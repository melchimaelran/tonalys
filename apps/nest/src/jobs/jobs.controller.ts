import {
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
  ) {}

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
      queuePosition: await this.queuePosition(job),
    };
  }

  // Called by the browser (navigator.sendBeacon) when the upload page is
  // closed mid-analysis. Hard-deletes the track — cascade removes the job
  // and any chord segments — and drops the audio object from storage, so an
  // abandoned analysis leaves nothing behind. The worker checks the track
  // still exists between phases and bails out if it's gone.
  @Post(':id/cancel')
  @HttpCode(204)
  async cancel(@Param('id') id: string): Promise<void> {
    const job = await this.prismaService.analysisJob.findUnique({
      where: { id },
      include: { track: true },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Already finished (or already errored) — nothing to tear down.
    if (job.status === 'DONE' || job.status === 'ERROR') {
      return;
    }

    if (job.track?.audioFileKey) {
      await this.storageService
        .remove(job.track.audioFileKey)
        .catch(() => undefined);
    }

    await this.prismaService.track.delete({ where: { id: job.trackId } });
  }

  // Where a still-queued job sits in line: everything currently running plus
  // every older job still waiting, then +1 for itself. 0 once it's no longer
  // PENDING (running, done or errored). The worker takes one job at a time
  // (RabbitMQ prefetch=1), so this is also roughly "jobs before mine".
  private async queuePosition(job: {
    status: string;
    createdAt: Date;
  }): Promise<number> {
    if (job.status !== 'PENDING') {
      return 0;
    }

    const ahead = await this.prismaService.analysisJob.count({
      where: {
        OR: [
          { status: 'PROCESSING' },
          { status: 'PENDING', createdAt: { lt: job.createdAt } },
        ],
      },
    });

    return ahead + 1;
  }
}
