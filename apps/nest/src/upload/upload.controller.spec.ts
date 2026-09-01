import { BadRequestException } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';

describe('UploadController', () => {
  let controller: UploadController;
  let storageService: { upload: jest.Mock; remove: jest.Mock };
  let prismaService: { $transaction: jest.Mock };
  let rabbitMQService: { publish: jest.Mock };
  let txTrack: { create: jest.Mock; count: jest.Mock };
  let txAnalysisJob: { create: jest.Mock };

  beforeEach(() => {
    storageService = {
      upload: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    txTrack = { create: jest.fn(), count: jest.fn().mockResolvedValue(0) };
    txAnalysisJob = { create: jest.fn() };
    prismaService = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({ track: txTrack, analysisJob: txAnalysisJob }),
      ),
    };
    rabbitMQService = { publish: jest.fn() };

    controller = new UploadController(
      storageService as unknown as StorageService,
      prismaService as unknown as PrismaService,
      rabbitMQService as unknown as RabbitMQService,
    );
  });

  it('throws BadRequestException when no file is provided', async () => {
    await expect(
      controller.upload(undefined as unknown as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);

    expect(storageService.upload).not.toHaveBeenCalled();
  });

  it('stores the file and creates a pending Track with a pending AnalysisJob', async () => {
    const file = {
      originalname: 'song.mp3',
      buffer: Buffer.from('audio-bytes'),
    } as Express.Multer.File;
    storageService.upload.mockImplementation((key: string) =>
      Promise.resolve(key),
    );
    txTrack.create.mockResolvedValue({
      id: 'track-1',
      title: 'song.mp3',
      status: 'PENDING',
    });
    txAnalysisJob.create.mockResolvedValue({
      id: 'job-1',
      trackId: 'track-1',
      status: 'PENDING',
    });

    const result = await controller.upload(file);

    const [uploadKey, uploadedBuffer] = storageService.upload.mock.calls[0] as [
      string,
      Buffer,
    ];
    expect(uploadKey).toMatch(/\.mp3$/);
    expect(uploadedBuffer).toBe(file.buffer);

    expect(txTrack.create).toHaveBeenCalledWith({
      data: {
        title: 'song.mp3',
        sourceType: 'UPLOAD',
        status: 'PENDING',
        audioFileKey: uploadKey,
        isDemo: true,
      },
    });
    expect(txAnalysisJob.create).toHaveBeenCalledWith({
      data: {
        trackId: 'track-1',
        status: 'PENDING',
      },
    });
    expect(result).toEqual({
      id: 'track-1',
      title: 'song.mp3',
      status: 'PENDING',
      jobId: 'job-1',
    });
    expect(storageService.remove).not.toHaveBeenCalled();
    expect(rabbitMQService.publish).toHaveBeenCalledWith({
      trackId: 'track-1',
      jobId: 'job-1',
    });
  });

  it('flags the track as a demo while fewer than 20 demos exist', async () => {
    const file = {
      originalname: 'song.mp3',
      buffer: Buffer.from('audio-bytes'),
    } as Express.Multer.File;
    storageService.upload.mockImplementation((key: string) =>
      Promise.resolve(key),
    );
    txTrack.count.mockResolvedValue(19);
    txTrack.create.mockResolvedValue({ id: 'track-1', status: 'PENDING' });
    txAnalysisJob.create.mockResolvedValue({ id: 'job-1', status: 'PENDING' });

    await controller.upload(file);

    expect(txTrack.count).toHaveBeenCalledWith({ where: { isDemo: true } });
    const [createCall] = txTrack.create.mock.calls as Array<
      [{ data: { isDemo: boolean } }]
    >;
    expect(createCall[0].data.isDemo).toBe(true);
  });

  it('does not flag the track as a demo once 20 demos exist', async () => {
    const file = {
      originalname: 'song.mp3',
      buffer: Buffer.from('audio-bytes'),
    } as Express.Multer.File;
    storageService.upload.mockImplementation((key: string) =>
      Promise.resolve(key),
    );
    txTrack.count.mockResolvedValue(20);
    txTrack.create.mockResolvedValue({ id: 'track-1', status: 'PENDING' });
    txAnalysisJob.create.mockResolvedValue({ id: 'job-1', status: 'PENDING' });

    await controller.upload(file);

    const [createCall] = txTrack.create.mock.calls as Array<
      [{ data: { isDemo: boolean } }]
    >;
    expect(createCall[0].data.isDemo).toBe(false);
  });

  it('does not publish if the transaction fails', async () => {
    const file = {
      originalname: 'song.mp3',
      buffer: Buffer.from('audio-bytes'),
    } as Express.Multer.File;
    storageService.upload.mockImplementation((key: string) =>
      Promise.resolve(key),
    );
    prismaService.$transaction.mockRejectedValue(new Error('db down'));

    await expect(controller.upload(file)).rejects.toThrow('db down');

    expect(rabbitMQService.publish).not.toHaveBeenCalled();
  });

  it('removes the uploaded file if the transaction fails', async () => {
    const file = {
      originalname: 'song.mp3',
      buffer: Buffer.from('audio-bytes'),
    } as Express.Multer.File;
    storageService.upload.mockImplementation((key: string) =>
      Promise.resolve(key),
    );
    prismaService.$transaction.mockRejectedValue(new Error('db down'));

    await expect(controller.upload(file)).rejects.toThrow('db down');

    const [uploadKey] = storageService.upload.mock.calls[0] as [string];
    expect(storageService.remove).toHaveBeenCalledWith(uploadKey);
  });
});
