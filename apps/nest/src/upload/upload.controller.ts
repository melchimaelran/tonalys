import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly storageService: StorageService,
    private readonly prismaService: PrismaService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
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

    try {
      return await this.prismaService.track.create({
        data: {
          title: file.originalname,
          sourceType: 'UPLOAD',
          status: 'PENDING',
          audioFileKey: key,
        },
      });
    } catch (error) {
      await this.storageService.remove(key).catch(() => undefined);
      throw error;
    }
  }
}
