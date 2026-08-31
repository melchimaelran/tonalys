import {
  HttpException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import type { Readable } from 'node:stream';
import { TracksController } from './tracks.controller';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

describe('TracksController', () => {
  let controller: TracksController;
  let prismaService: {
    track: { findUnique: jest.Mock; findMany: jest.Mock };
    chordSegment: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };
  let storageService: { download: jest.Mock };
  let res: { set: jest.Mock; status: jest.Mock };

  beforeEach(() => {
    prismaService = {
      track: { findUnique: jest.fn(), findMany: jest.fn() },
      chordSegment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };
    storageService = { download: jest.fn() };
    res = { set: jest.fn(), status: jest.fn() };
    controller = new TracksController(
      prismaService as unknown as PrismaService,
      storageService as unknown as StorageService,
    );
  });

  it('streams the whole audio file with an mp3 content type when no Range is given', async () => {
    prismaService.track.findUnique.mockResolvedValue({
      id: 'track-1',
      audioFileKey: 'abc.mp3',
    });
    const buffer = Buffer.from('audio-bytes');
    storageService.download.mockResolvedValue(buffer);

    const result = await controller.streamAudio(
      'track-1',
      undefined,
      res as never,
    );

    expect(prismaService.track.findUnique).toHaveBeenCalledWith({
      where: { id: 'track-1' },
    });
    expect(storageService.download).toHaveBeenCalledWith('abc.mp3');
    expect(res.set).toHaveBeenCalledWith('Accept-Ranges', 'bytes');
    expect(res.status).not.toHaveBeenCalled();
    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.options.type).toBe('audio/mpeg');
    expect(result.options.length).toBe(buffer.length);
  });

  it('streams the audio file with a wav content type', async () => {
    prismaService.track.findUnique.mockResolvedValue({
      id: 'track-1',
      audioFileKey: 'abc.wav',
    });
    storageService.download.mockResolvedValue(Buffer.from('audio-bytes'));

    const result = await controller.streamAudio(
      'track-1',
      undefined,
      res as never,
    );

    expect(result.options.type).toBe('audio/wav');
  });

  it('returns a 206 partial response for a byte range', async () => {
    prismaService.track.findUnique.mockResolvedValue({
      id: 'track-1',
      audioFileKey: 'abc.mp3',
    });
    const buffer = Buffer.from('0123456789');
    storageService.download.mockResolvedValue(buffer);

    const result = await controller.streamAudio(
      'track-1',
      'bytes=2-5',
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(206);
    expect(res.set).toHaveBeenCalledWith('Accept-Ranges', 'bytes');
    expect(res.set).toHaveBeenCalledWith('Content-Range', 'bytes 2-5/10');
    expect(result.options.length).toBe(4);
    const chunk = await streamToBuffer(result.getStream());
    expect(chunk.toString()).toBe('2345');
  });

  it('returns a 206 partial response for an open-ended byte range', async () => {
    prismaService.track.findUnique.mockResolvedValue({
      id: 'track-1',
      audioFileKey: 'abc.mp3',
    });
    const buffer = Buffer.from('0123456789');
    storageService.download.mockResolvedValue(buffer);

    const result = await controller.streamAudio(
      'track-1',
      'bytes=7-',
      res as never,
    );

    expect(res.set).toHaveBeenCalledWith('Content-Range', 'bytes 7-9/10');
    const chunk = await streamToBuffer(result.getStream());
    expect(chunk.toString()).toBe('789');
  });

  it('clamps a range end that overflows past the end of the file', async () => {
    prismaService.track.findUnique.mockResolvedValue({
      id: 'track-1',
      audioFileKey: 'abc.mp3',
    });
    const buffer = Buffer.from('0123456789');
    storageService.download.mockResolvedValue(buffer);

    const result = await controller.streamAudio(
      'track-1',
      'bytes=5-999999',
      res as never,
    );

    expect(res.set).toHaveBeenCalledWith('Content-Range', 'bytes 5-9/10');
    const chunk = await streamToBuffer(result.getStream());
    expect(chunk.toString()).toBe('56789');
  });

  it('returns 416 when the range start is past the end of the file', async () => {
    prismaService.track.findUnique.mockResolvedValue({
      id: 'track-1',
      audioFileKey: 'abc.mp3',
    });
    storageService.download.mockResolvedValue(Buffer.from('0123456789'));

    await expect(
      controller.streamAudio('track-1', 'bytes=1000-', res as never),
    ).rejects.toThrow(HttpException);
    expect(res.set).toHaveBeenCalledWith('Content-Range', 'bytes */10');
  });

  it('returns 416 when the range start is after the range end', async () => {
    prismaService.track.findUnique.mockResolvedValue({
      id: 'track-1',
      audioFileKey: 'abc.mp3',
    });
    storageService.download.mockResolvedValue(Buffer.from('0123456789'));

    await expect(
      controller.streamAudio('track-1', 'bytes=8-2', res as never),
    ).rejects.toThrow(HttpException);
  });

  it('throws NotFoundException when the track does not exist', async () => {
    prismaService.track.findUnique.mockResolvedValue(null);

    await expect(
      controller.streamAudio('unknown', undefined, res as never),
    ).rejects.toThrow(NotFoundException);
  });

  it('lists all tracks, newest first', async () => {
    const tracks = [
      {
        id: 'track-2',
        title: 'Newer.mp3',
        status: 'READY',
        sourceType: 'UPLOAD',
        durationSeconds: 180,
        createdAt: new Date('2026-02-01T00:00:00Z'),
      },
      {
        id: 'track-1',
        title: 'Older.mp3',
        status: 'READY',
        sourceType: 'YOUTUBE',
        durationSeconds: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      },
    ];
    prismaService.track.findMany.mockResolvedValue(tracks);

    const result = await controller.listTracks();

    expect(prismaService.track.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        sourceType: true,
        durationSeconds: true,
        createdAt: true,
      },
    });
    expect(result).toBe(tracks);
  });

  it('returns the track title', async () => {
    prismaService.track.findUnique.mockResolvedValue({
      id: 'track-1',
      title: 'My Song.mp3',
      tempoBpm: null,
      keyRoot: null,
      keyScale: null,
    });

    const result = await controller.getTrack('track-1');

    expect(prismaService.track.findUnique).toHaveBeenCalledWith({
      where: { id: 'track-1' },
      select: {
        id: true,
        title: true,
        tempoBpm: true,
        keyRoot: true,
        keyScale: true,
      },
    });
    expect(result).toEqual({
      id: 'track-1',
      title: 'My Song.mp3',
      tempoBpm: null,
      keyRoot: null,
      keyScale: null,
    });
  });

  it('returns the analyzed tempo and key once available', async () => {
    prismaService.track.findUnique.mockResolvedValue({
      id: 'track-1',
      title: 'My Song.mp3',
      tempoBpm: 120,
      keyRoot: 'C',
      keyScale: 'major',
    });

    const result = await controller.getTrack('track-1');

    expect(result).toEqual({
      id: 'track-1',
      title: 'My Song.mp3',
      tempoBpm: 120,
      keyRoot: 'C',
      keyScale: 'major',
    });
  });

  it('throws NotFoundException for getTrack when the track does not exist', async () => {
    prismaService.track.findUnique.mockResolvedValue(null);

    await expect(controller.getTrack('unknown')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns the chord segments for a track, ordered by start time', async () => {
    prismaService.track.findUnique.mockResolvedValue({ id: 'track-1' });
    prismaService.chordSegment.findMany.mockResolvedValue([
      {
        id: 'seg-1',
        startTime: 0,
        endTime: 2.5,
        root: 'C',
        chordType: 'maj',
      },
    ]);

    const result = await controller.getChords('track-1');

    expect(prismaService.chordSegment.findMany).toHaveBeenCalledWith({
      where: { trackId: 'track-1' },
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        root: true,
        chordType: true,
        bassNote: true,
      },
    });
    expect(result).toEqual([
      { id: 'seg-1', startTime: 0, endTime: 2.5, root: 'C', chordType: 'maj' },
    ]);
  });

  it('throws NotFoundException for chords when the track does not exist', async () => {
    prismaService.track.findUnique.mockResolvedValue(null);

    await expect(controller.getChords('unknown')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates the chord segment and marks it as a manual edit', async () => {
    prismaService.chordSegment.findFirst.mockResolvedValue({
      id: 'seg-1',
      trackId: 'track-1',
    });
    prismaService.chordSegment.update.mockResolvedValue({
      id: 'seg-1',
      startTime: 0,
      endTime: 2.5,
      root: 'G',
      chordType: 'minor',
    });

    const result = await controller.updateChord('track-1', 'seg-1', {
      root: 'G',
      chordType: 'minor',
    });

    expect(prismaService.chordSegment.findFirst).toHaveBeenCalledWith({
      where: { id: 'seg-1', trackId: 'track-1' },
    });
    expect(prismaService.chordSegment.update).toHaveBeenCalledWith({
      where: { id: 'seg-1' },
      data: {
        root: 'G',
        chordType: 'minor',
        bassNote: null,
        isManualEdit: true,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        root: true,
        chordType: true,
        bassNote: true,
      },
    });
    expect(result).toEqual({
      id: 'seg-1',
      startTime: 0,
      endTime: 2.5,
      root: 'G',
      chordType: 'minor',
    });
  });

  it('sets the bass note for a slash chord edit', async () => {
    prismaService.chordSegment.findFirst.mockResolvedValue({
      id: 'seg-1',
      trackId: 'track-1',
    });
    prismaService.chordSegment.update.mockResolvedValue({
      id: 'seg-1',
      startTime: 0,
      endTime: 2.5,
      root: 'C',
      chordType: 'major',
      bassNote: 'F',
    });

    await controller.updateChord('track-1', 'seg-1', {
      root: 'C',
      chordType: 'major',
      bassNote: 'F',
    });

    expect(prismaService.chordSegment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          root: 'C',
          chordType: 'major',
          bassNote: 'F',
          isManualEdit: true,
        },
      }),
    );
  });

  it('clears the bass note when editing a slash chord back to a plain chord', async () => {
    prismaService.chordSegment.findFirst.mockResolvedValue({
      id: 'seg-1',
      trackId: 'track-1',
    });
    prismaService.chordSegment.update.mockResolvedValue({
      id: 'seg-1',
      startTime: 0,
      endTime: 2.5,
      root: 'C',
      chordType: 'major',
      bassNote: null,
    });

    await controller.updateChord('track-1', 'seg-1', {
      root: 'C',
      chordType: 'major',
      bassNote: null,
    });

    expect(prismaService.chordSegment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          root: 'C',
          chordType: 'major',
          bassNote: null,
          isManualEdit: true,
        },
      }),
    );
  });

  it('throws NotFoundException when the segment does not exist', async () => {
    prismaService.chordSegment.findFirst.mockResolvedValue(null);

    await expect(
      controller.updateChord('track-1', 'unknown', {
        root: 'G',
        chordType: 'minor',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(prismaService.chordSegment.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the segment does not belong to the track', async () => {
    // A compound where (id + trackId) means Prisma itself returns null for a
    // mismatched track — the controller no longer needs a separate check.
    prismaService.chordSegment.findFirst.mockResolvedValue(null);

    await expect(
      controller.updateChord('track-1', 'seg-1', {
        root: 'G',
        chordType: 'minor',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(prismaService.chordSegment.update).not.toHaveBeenCalled();
  });
});
