import { NotFoundException } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

describe('JobsController', () => {
  let controller: JobsController;
  let prismaService: {
    analysisJob: { findUnique: jest.Mock; count: jest.Mock };
    track: { delete: jest.Mock };
  };
  let storageService: { remove: jest.Mock };

  beforeEach(() => {
    prismaService = {
      analysisJob: { findUnique: jest.fn(), count: jest.fn() },
      track: { delete: jest.fn() },
    };
    storageService = { remove: jest.fn().mockResolvedValue(undefined) };
    controller = new JobsController(
      prismaService as unknown as PrismaService,
      storageService as unknown as StorageService,
    );
  });

  it('returns the job with queuePosition 0 when it is already processing', async () => {
    prismaService.analysisJob.findUnique.mockResolvedValue({
      id: 'job-1',
      trackId: 'track-1',
      status: 'PROCESSING',
      errorMessage: null,
      createdAt: new Date('2026-09-01T10:00:00Z'),
    });

    const result = await controller.findOne('job-1');

    expect(prismaService.analysisJob.findUnique).toHaveBeenCalledWith({
      where: { id: 'job-1' },
    });
    expect(prismaService.analysisJob.count).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: 'job-1',
      trackId: 'track-1',
      status: 'PROCESSING',
      errorMessage: null,
      queuePosition: 0,
    });
  });

  it('reports the queue position for a PENDING job as the jobs ahead of it plus one', async () => {
    const createdAt = new Date('2026-09-01T10:00:00Z');
    prismaService.analysisJob.findUnique.mockResolvedValue({
      id: 'job-2',
      trackId: 'track-2',
      status: 'PENDING',
      errorMessage: null,
      createdAt,
    });
    // 1 running + 2 older still-pending jobs ahead of this one.
    prismaService.analysisJob.count.mockResolvedValue(3);

    const result = await controller.findOne('job-2');

    expect(prismaService.analysisJob.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { status: 'PROCESSING' },
          { status: 'PENDING', createdAt: { lt: createdAt } },
        ],
      },
    });
    expect(result).toEqual({
      id: 'job-2',
      trackId: 'track-2',
      status: 'PENDING',
      errorMessage: null,
      queuePosition: 4,
    });
  });

  it('throws NotFoundException when the job does not exist', async () => {
    prismaService.analysisJob.findUnique.mockResolvedValue(null);

    await expect(controller.findOne('unknown')).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('cancel', () => {
    it('deletes the track and removes its audio object for a still-running job', async () => {
      prismaService.analysisJob.findUnique.mockResolvedValue({
        id: 'job-1',
        trackId: 'track-1',
        status: 'PROCESSING',
        track: { id: 'track-1', audioFileKey: 'abc.mp3' },
      });

      await controller.cancel('job-1');

      expect(storageService.remove).toHaveBeenCalledWith('abc.mp3');
      expect(prismaService.track.delete).toHaveBeenCalledWith({
        where: { id: 'track-1' },
      });
    });

    it('does not fail the request when the audio object is already gone', async () => {
      prismaService.analysisJob.findUnique.mockResolvedValue({
        id: 'job-1',
        trackId: 'track-1',
        status: 'PENDING',
        track: { id: 'track-1', audioFileKey: 'abc.mp3' },
      });
      storageService.remove.mockRejectedValue(new Error('NoSuchKey'));

      await expect(controller.cancel('job-1')).resolves.toBeUndefined();
      expect(prismaService.track.delete).toHaveBeenCalledWith({
        where: { id: 'track-1' },
      });
    });

    it('is a no-op for a job that has already finished', async () => {
      prismaService.analysisJob.findUnique.mockResolvedValue({
        id: 'job-1',
        trackId: 'track-1',
        status: 'DONE',
        track: { id: 'track-1', audioFileKey: 'abc.mp3' },
      });

      await controller.cancel('job-1');

      expect(storageService.remove).not.toHaveBeenCalled();
      expect(prismaService.track.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the job does not exist', async () => {
      prismaService.analysisJob.findUnique.mockResolvedValue(null);

      await expect(controller.cancel('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
