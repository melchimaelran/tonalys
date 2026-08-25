import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as amqp from 'amqplib';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { StorageService } from './../src/storage/storage.service';
import { ANALYSIS_JOBS_QUEUE } from './../src/rabbitmq/rabbitmq.service';

describe('UploadController (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;
  let storageService: StorageService;
  let accessToken: string;
  const createdTrackIds: string[] = [];
  const uploadedKeys: string[] = [];

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    prismaService = app.get(PrismaService);
    storageService = app.get(StorageService);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ password: 'test-password-e2e' })
      .expect(201);
    accessToken = (login.body as { access_token: string }).access_token;
  });

  afterEach(async () => {
    if (createdTrackIds.length > 0) {
      await prismaService.track.deleteMany({
        where: { id: { in: createdTrackIds } },
      });
      createdTrackIds.length = 0;
    }
    if (uploadedKeys.length > 0) {
      await Promise.all(
        uploadedKeys.map((key) =>
          storageService.remove(key).catch(() => undefined),
        ),
      );
      uploadedKeys.length = 0;
    }
    await app.close();
  });

  it('POST /upload returns 401 without a token', () => {
    return request(app.getHttpServer())
      .post('/upload')
      .attach('file', Buffer.from('audio-bytes'), 'song.mp3')
      .expect(401);
  });

  it('POST /upload returns 400 when no file is attached', () => {
    return request(app.getHttpServer())
      .post('/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('POST /upload rejects a file larger than 20 MB', () => {
    const oversized = Buffer.alloc(20 * 1024 * 1024 + 1);

    return request(app.getHttpServer())
      .post('/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', oversized, 'big.mp3')
      .expect(413);
  });

  it('POST /upload stores the file, creates a pending Track + AnalysisJob, and publishes to the queue', async () => {
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);
    try {
      const channel = await connection.createChannel();
      try {
        await channel.assertQueue(ANALYSIS_JOBS_QUEUE, { durable: true });
        await channel.purgeQueue(ANALYSIS_JOBS_QUEUE);

        const response = await request(app.getHttpServer())
          .post('/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('file', Buffer.from('audio-bytes'), 'song.mp3')
          .expect(201);

        const track = response.body as {
          id: string;
          title: string;
          status: string;
          audioFileKey: string;
        };
        createdTrackIds.push(track.id);
        uploadedKeys.push(track.audioFileKey);

        expect(track.title).toBe('song.mp3');
        expect(track.status).toBe('PENDING');
        expect(track.audioFileKey).toMatch(/\.mp3$/);

        const stored = await prismaService.track.findUnique({
          where: { id: track.id },
        });
        expect(stored?.status).toBe('PENDING');

        const analysisJobs = await prismaService.analysisJob.findMany({
          where: { trackId: track.id },
        });
        expect(analysisJobs).toHaveLength(1);
        expect(analysisJobs[0]?.status).toBe('PENDING');

        const message = await new Promise<Record<string, unknown>>(
          (resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error('timed out waiting for message')),
              5000,
            );
            void channel.consume(ANALYSIS_JOBS_QUEUE, (msg) => {
              if (!msg) return;
              clearTimeout(timeout);
              channel.ack(msg);
              resolve(
                JSON.parse(msg.content.toString()) as Record<string, unknown>,
              );
            });
          },
        );

        expect(message).toEqual({
          trackId: track.id,
          jobId: analysisJobs[0]?.id,
        });
      } finally {
        await channel.close();
      }
    } finally {
      await connection.close();
    }
  });
});
