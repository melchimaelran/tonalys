import {
  BadRequestException,
  Body,
  Controller,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { CreateYoutubeTrackDto } from './dto/create-youtube-track.dto';
import { YoutubeService } from './youtube.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { DailyQuotaGuard } from '../quota/daily-quota.guard';

const MAX_DURATION_SECONDS = 10 * 60;

@Controller('youtube')
@UseGuards(DailyQuotaGuard)
export class YoutubeController {
  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly prismaService: PrismaService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  @Post()
  async create(@Body() dto: CreateYoutubeTrackDto) {
    const info = await this.youtubeService.getVideoInfo(dto.url);

    if (!info.available) {
      if (info.reason === 'blocked') {
        // YouTube is refusing our worker's requests (datacenter-IP
        // bot-check / rate-limit) — nothing wrong with the link. Fixed
        // on our side by refreshing the worker's YouTube cookies.
        throw new ServiceUnavailableException(
          'YouTube analysis is temporarily unavailable while we refresh access on our side. Please try again later.',
        );
      }
      throw new BadRequestException('Video is unavailable or private');
    }
    if (
      info.durationSeconds === null ||
      info.durationSeconds > MAX_DURATION_SECONDS
    ) {
      throw new BadRequestException('Video exceeds the 10 minute limit');
    }

    const { track, job } = await this.prismaService.$transaction(async (tx) => {
      // First 20 tracks ever analysed become the homepage "Demo songs"
      // (see upload.controller.ts for the rationale).
      const demoCount = await tx.track.count({ where: { isDemo: true } });
      const createdTrack = await tx.track.create({
        data: {
          title: info.title ?? dto.url,
          sourceType: 'YOUTUBE',
          sourceUrl: dto.url,
          durationSeconds: info.durationSeconds,
          status: 'PENDING',
          isDemo: demoCount < 20,
        },
      });
      const createdJob = await tx.analysisJob.create({
        data: { trackId: createdTrack.id, status: 'PENDING' },
      });
      return { track: createdTrack, job: createdJob };
    });

    this.rabbitMQService.publish({ trackId: track.id, jobId: job.id });

    return { ...track, jobId: job.id };
  }
}
