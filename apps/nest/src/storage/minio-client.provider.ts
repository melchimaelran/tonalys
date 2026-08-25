import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';
import { Client } from 'minio';

export const MINIO_CLIENT = 'MINIO_CLIENT';

export const minioClientProvider: Provider = {
  provide: MINIO_CLIENT,
  useFactory: (configService: ConfigService) =>
    new Client({
      endPoint: configService.get<string>('MINIO_ENDPOINT')!,
      port: Number(configService.get<string>('MINIO_PORT')),
      useSSL: false,
      accessKey: configService.get<string>('MINIO_ROOT_USER')!,
      secretKey: configService.get<string>('MINIO_ROOT_PASSWORD')!,
    }),
  inject: [ConfigService],
};
