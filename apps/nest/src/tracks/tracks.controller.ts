import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { extname } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const AUDIO_MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function parseRange(
  range: string | undefined,
  totalLength: number,
): { start: number; end: number } | null {
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (!match[1] && !match[2])) {
    return null;
  }

  const start = match[1] ? parseInt(match[1], 10) : 0;
  const end = match[2] ? parseInt(match[2], 10) : totalLength - 1;
  return { start, end };
}

@Controller('tracks')
export class TracksController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  @Get(':id/audio')
  async streamAudio(
    @Param('id') id: string,
    @Headers('range') range: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const track = await this.prismaService.track.findUnique({
      where: { id },
    });

    if (!track || !track.audioFileKey) {
      throw new NotFoundException('Track not found');
    }

    const buffer = await this.storageService.download(track.audioFileKey);
    const type =
      AUDIO_MIME_TYPES[extname(track.audioFileKey)] ??
      'application/octet-stream';

    res.set('Accept-Ranges', 'bytes');

    const parsed = parseRange(range, buffer.length);
    if (!parsed) {
      return new StreamableFile(buffer, { type });
    }

    const { start, end } = parsed;
    const chunk = buffer.subarray(start, end + 1);
    res.status(206);
    res.set('Content-Range', `bytes ${start}-${end}/${buffer.length}`);

    return new StreamableFile(chunk, { type });
  }

  @Get(':id/chords')
  async getChords(@Param('id') id: string) {
    const track = await this.prismaService.track.findUnique({
      where: { id },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    return this.prismaService.chordSegment.findMany({
      where: { trackId: id },
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        root: true,
        chordType: true,
      },
    });
  }
}
