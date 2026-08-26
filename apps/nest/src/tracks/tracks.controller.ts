import {
  Controller,
  Get,
  NotFoundException,
  Param,
  StreamableFile,
} from '@nestjs/common';
import { extname } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const AUDIO_MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

@Controller('tracks')
export class TracksController {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  @Get(':id/audio')
  async streamAudio(@Param('id') id: string): Promise<StreamableFile> {
    const track = await this.prismaService.track.findUnique({
      where: { id },
    });

    if (!track || !track.audioFileKey) {
      throw new NotFoundException('Track not found');
    }

    const stream = await this.storageService.download(track.audioFileKey);
    const type =
      AUDIO_MIME_TYPES[extname(track.audioFileKey)] ??
      'application/octet-stream';

    return new StreamableFile(stream, { type });
  }
}
