import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { MINIO_CLIENT } from './minio-client.provider';

@Injectable()
export class StorageService {
  constructor(
    @Inject(MINIO_CLIENT) private readonly client: Client,
    private readonly configService: ConfigService,
  ) {}

  async upload(key: string, buffer: Buffer): Promise<string> {
    const bucket = this.configService.get<string>('MINIO_BUCKET')!;

    const exists = await this.client.bucketExists(bucket);
    if (!exists) {
      await this.client.makeBucket(bucket);
    }

    await this.client.putObject(bucket, key, buffer, buffer.length);

    return key;
  }

  async remove(key: string): Promise<void> {
    const bucket = this.configService.get<string>('MINIO_BUCKET')!;
    await this.client.removeObject(bucket, key);
  }

  async download(key: string): Promise<Buffer> {
    const bucket = this.configService.get<string>('MINIO_BUCKET')!;
    const stream = await this.client.getObject(bucket, key);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
  }
}
