import { BadRequestException } from '@nestjs/common';
import { YoutubeController } from './youtube.controller';
import { YoutubeService } from './youtube.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

describe('YoutubeController', () => {
  let controller: YoutubeController;
  let youtubeService: { getVideoInfo: jest.Mock };
  let prismaService: { $transaction: jest.Mock };
  let rabbitMQService: { publish: jest.Mock };
  let txTrack: { create: jest.Mock };
  let txAnalysisJob: { create: jest.Mock };

  const VALID_URL = 'https://www.youtube.com/watch?v=abc12345678';

  beforeEach(() => {
    youtubeService = { getVideoInfo: jest.fn() };
    txTrack = { create: jest.fn() };
    txAnalysisJob = { create: jest.fn() };
    prismaService = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({ track: txTrack, analysisJob: txAnalysisJob }),
      ),
    };
    rabbitMQService = { publish: jest.fn() };

    controller = new YoutubeController(
      youtubeService as unknown as YoutubeService,
      prismaService as unknown as PrismaService,
      rabbitMQService as unknown as RabbitMQService,
    );
  });

  it('rejects an unavailable video without creating a Track', async () => {
    youtubeService.getVideoInfo.mockResolvedValue({
      available: false,
      title: null,
      durationSeconds: null,
    });

    await expect(controller.create({ url: VALID_URL })).rejects.toThrow(
      BadRequestException,
    );
    expect(txTrack.create).not.toHaveBeenCalled();
  });

  it('rejects a video longer than 10 minutes without creating a Track', async () => {
    youtubeService.getVideoInfo.mockResolvedValue({
      available: true,
      title: 'Long video',
      durationSeconds: 601,
    });

    await expect(controller.create({ url: VALID_URL })).rejects.toThrow(
      BadRequestException,
    );
    expect(txTrack.create).not.toHaveBeenCalled();
  });

  it('accepts a video exactly at the 10 minute limit', async () => {
    youtubeService.getVideoInfo.mockResolvedValue({
      available: true,
      title: 'Ten minutes',
      durationSeconds: 600,
    });
    txTrack.create.mockResolvedValue({ id: 'track-1', status: 'PENDING' });
    txAnalysisJob.create.mockResolvedValue({ id: 'job-1', status: 'PENDING' });

    await expect(controller.create({ url: VALID_URL })).resolves.toBeDefined();
  });

  it('creates a pending Track + AnalysisJob and publishes to the queue for a valid link', async () => {
    youtubeService.getVideoInfo.mockResolvedValue({
      available: true,
      title: 'A great song',
      durationSeconds: 180,
    });
    txTrack.create.mockResolvedValue({
      id: 'track-1',
      title: 'A great song',
      status: 'PENDING',
    });
    txAnalysisJob.create.mockResolvedValue({
      id: 'job-1',
      trackId: 'track-1',
      status: 'PENDING',
    });

    const result = await controller.create({ url: VALID_URL });

    expect(txTrack.create).toHaveBeenCalledWith({
      data: {
        title: 'A great song',
        sourceType: 'YOUTUBE',
        sourceUrl: VALID_URL,
        durationSeconds: 180,
        status: 'PENDING',
      },
    });
    expect(txAnalysisJob.create).toHaveBeenCalledWith({
      data: { trackId: 'track-1', status: 'PENDING' },
    });
    expect(rabbitMQService.publish).toHaveBeenCalledWith({
      trackId: 'track-1',
      jobId: 'job-1',
    });
    expect(result).toEqual({
      id: 'track-1',
      title: 'A great song',
      status: 'PENDING',
    });
  });
});
