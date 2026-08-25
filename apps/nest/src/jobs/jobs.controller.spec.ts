import { NotFoundException } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('JobsController', () => {
  let controller: JobsController;
  let prismaService: { analysisJob: { findUnique: jest.Mock } };

  beforeEach(() => {
    prismaService = { analysisJob: { findUnique: jest.fn() } };
    controller = new JobsController(prismaService as unknown as PrismaService);
  });

  it('returns the job when it exists', async () => {
    prismaService.analysisJob.findUnique.mockResolvedValue({
      id: 'job-1',
      trackId: 'track-1',
      status: 'PROCESSING',
      errorMessage: null,
    });

    const result = await controller.findOne('job-1');

    expect(prismaService.analysisJob.findUnique).toHaveBeenCalledWith({
      where: { id: 'job-1' },
    });
    expect(result).toEqual({
      id: 'job-1',
      trackId: 'track-1',
      status: 'PROCESSING',
      errorMessage: null,
    });
  });

  it('throws NotFoundException when the job does not exist', async () => {
    prismaService.analysisJob.findUnique.mockResolvedValue(null);

    await expect(controller.findOne('unknown')).rejects.toThrow(
      NotFoundException,
    );
  });
});
