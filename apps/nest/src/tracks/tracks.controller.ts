import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { extname } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { UpdateChordSegmentDto } from './dto/update-chord-segment.dto';

const AUDIO_MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function parseRange(
  range: string | undefined,
): { start: number; end: number | null } | null {
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (!match[1] && !match[2])) {
    return null;
  }

  return {
    start: match[1] ? parseInt(match[1], 10) : 0,
    end: match[2] ? parseInt(match[2], 10) : null,
  };
}

@Controller('tracks')
export class TracksController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  async listTracks() {
    return this.prismaService.track.findMany({
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
  }

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

    const parsed = parseRange(range);
    if (!parsed) {
      return new StreamableFile(buffer, { type });
    }

    const totalLength = buffer.length;
    const { start } = parsed;
    const end = Math.min(parsed.end ?? totalLength - 1, totalLength - 1);

    if (start >= totalLength || start > end) {
      res.set('Content-Range', `bytes */${totalLength}`);
      throw new HttpException(
        'Range Not Satisfiable',
        HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE,
      );
    }

    const chunk = buffer.subarray(start, end + 1);
    res.status(206);
    res.set('Content-Range', `bytes ${start}-${end}/${totalLength}`);

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
        bassNote: true,
      },
    });
  }

  @Patch(':id/chords/:segmentId')
  async updateChord(
    @Param('id') id: string,
    @Param('segmentId') segmentId: string,
    @Body() dto: UpdateChordSegmentDto,
  ) {
    const segment = await this.prismaService.chordSegment.findFirst({
      where: { id: segmentId, trackId: id },
    });

    if (!segment) {
      throw new NotFoundException('Chord segment not found');
    }

    return this.prismaService.chordSegment.update({
      where: { id: segmentId },
      data: {
        root: dto.root,
        chordType: dto.chordType,
        bassNote: dto.bassNote ?? null,
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
  }

  @Get(':id')
  async getTrack(@Param('id') id: string) {
    const track = await this.prismaService.track.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

    if (!track) {
      throw new NotFoundException('Track not found');
    }

    return track;
  }
}
