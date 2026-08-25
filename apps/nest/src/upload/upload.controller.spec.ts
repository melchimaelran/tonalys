import { BadRequestException } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UploadController', () => {
  let controller: UploadController;
  let storageService: { upload: jest.Mock; remove: jest.Mock };
  let prismaService: { track: { create: jest.Mock } };

  beforeEach(() => {
    storageService = {
      upload: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    prismaService = { track: { create: jest.fn() } };

    controller = new UploadController(
      storageService as unknown as StorageService,
      prismaService as unknown as PrismaService,
    );
  });

  it('throws BadRequestException when no file is provided', async () => {
    await expect(
      controller.upload(undefined as unknown as Express.Multer.File),
    ).rejects.toThrow(BadRequestException);

    expect(storageService.upload).not.toHaveBeenCalled();
  });

  it('stores the file and creates a pending Track', async () => {
    const file = {
      originalname: 'song.mp3',
      buffer: Buffer.from('audio-bytes'),
    } as Express.Multer.File;
    storageService.upload.mockImplementation((key: string) =>
      Promise.resolve(key),
    );
    prismaService.track.create.mockResolvedValue({
      id: 'track-1',
      title: 'song.mp3',
      status: 'PENDING',
    });

    const result = await controller.upload(file);

    const [uploadKey, uploadedBuffer] = storageService.upload.mock.calls[0] as [
      string,
      Buffer,
    ];
    expect(uploadKey).toMatch(/\.mp3$/);
    expect(uploadKey).not.toContain('song.mp3');
    expect(uploadedBuffer).toBe(file.buffer);

    expect(prismaService.track.create).toHaveBeenCalledWith({
      data: {
        title: 'song.mp3',
        sourceType: 'UPLOAD',
        status: 'PENDING',
        audioFileKey: uploadKey,
      },
    });
    expect(result).toEqual({
      id: 'track-1',
      title: 'song.mp3',
      status: 'PENDING',
    });
    expect(storageService.remove).not.toHaveBeenCalled();
  });

  it('removes the uploaded file if creating the Track fails', async () => {
    const file = {
      originalname: 'song.mp3',
      buffer: Buffer.from('audio-bytes'),
    } as Express.Multer.File;
    storageService.upload.mockImplementation((key: string) =>
      Promise.resolve(key),
    );
    prismaService.track.create.mockRejectedValue(new Error('db down'));

    await expect(controller.upload(file)).rejects.toThrow('db down');

    const [uploadKey] = storageService.upload.mock.calls[0] as [string];
    expect(storageService.remove).toHaveBeenCalledWith(uploadKey);
  });
});
