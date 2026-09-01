import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { RabbitMQService } from '../rabbitmq/rabbitmq.service';
import { DailyQuotaGuard } from '../quota/daily-quota.guard';

// Matches the client-side limit (apps/next's UploadDropzone, TON-011) —
// server-side enforcement too, since the client check is trivially
// bypassed by calling this endpoint directly.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

@Controller('upload')
@UseGuards(DailyQuotaGuard)
export class UploadController {
  constructor(
    private readonly storageService: StorageService,
    private readonly prismaService: PrismaService,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Never derive the storage key from the raw filename — it's unsanitized
    // user input (arbitrary characters, slashes). Extension only, stripped
    // to a safe charset, so the object still has a browser-recognizable
    // suffix; the human-readable name lives in Track.title instead.
    const extension = extname(file.originalname)
      .slice(0, 10)
      .replace(/[^a-zA-Z0-9.]/g, '');
    const key = `${randomUUID()}${extension}`;
    await this.storageService.upload(key, file.buffer);

    let track: { id: string };
    let job: { id: string };

    try {
      ({ track, job } = await this.prismaService.$transaction(async (tx) => {
        const createdTrack = await tx.track.create({
          data: {
            title: file.originalname,
            sourceType: 'UPLOAD',
            status: 'PENDING',
            audioFileKey: key,
          },
        });
        const createdJob = await tx.analysisJob.create({
          data: {
            trackId: createdTrack.id,
            status: 'PENDING',
          },
        });
        return { track: createdTrack, job: createdJob };
      }));
    } catch (error) {
      await this.storageService.remove(key).catch(() => undefined);
      throw error;
    }

    this.rabbitMQService.publish({ trackId: track.id, jobId: job.id });

    return { ...track, jobId: job.id };
  }
}
