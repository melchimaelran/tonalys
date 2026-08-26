import { NotFoundException, StreamableFile } from '@nestjs/common';
import { TracksController } from './tracks.controller';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

describe('TracksController', () => {
  let controller: TracksController;
  let prismaService: { track: { findUnique: jest.Mock } };
  let storageService: { download: jest.Mock };

  beforeEach(() => {
    prismaService = { track: { findUnique: jest.fn() } };
    storageService = { download: jest.fn() };
    controller = new TracksController(
      prismaService as unknown as PrismaService,
      storageService as unknown as StorageService,
    );
  });

  it('streams the audio file with an mp3 content type', async () => {
    prismaService.track.findUnique.mockResolvedValue({
      id: 'track-1',
      audioFileKey: 'abc.mp3',
    });
    const stream = { pipe: jest.fn() };
    storageService.download.mockResolvedValue(stream);

    const result = await controller.streamAudio('track-1');

    expect(prismaService.track.findUnique).toHaveBeenCalledWith({
      where: { id: 'track-1' },
    });
    expect(storageService.download).toHaveBeenCalledWith('abc.mp3');
    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.options.type).toBe('audio/mpeg');
  });

  it('streams the audio file with a wav content type', async () => {
    prismaService.track.findUnique.mockResolvedValue({
      id: 'track-1',
      audioFileKey: 'abc.wav',
    });
    storageService.download.mockResolvedValue({ pipe: jest.fn() });

    const result = await controller.streamAudio('track-1');

    expect(result.options.type).toBe('audio/wav');
  });

  it('throws NotFoundException when the track does not exist', async () => {
    prismaService.track.findUnique.mockResolvedValue(null);

    await expect(controller.streamAudio('unknown')).rejects.toThrow(
      NotFoundException,
    );
  });
});
