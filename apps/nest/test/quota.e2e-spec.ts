import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { DAILY_ANALYSIS_LIMIT } from './../src/quota/daily-quota.guard';

describe('Daily analysis quota (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;
  let accessToken: string;
  let quotaTrackId: string | null = null;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    prismaService = app.get(PrismaService);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ password: 'test-password-e2e' })
      .expect(201);
    accessToken = (login.body as { access_token: string }).access_token;

    // Top today's AnalysisJob count up to the limit with rows hung off one
    // throwaway track (deleting it cascades them away afterwards).
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const existing = await prismaService.analysisJob.count({
      where: { createdAt: { gte: since } },
    });

    const track = await prismaService.track.create({
      data: { title: 'Quota filler', sourceType: 'UPLOAD', status: 'ERROR' },
    });
    quotaTrackId = track.id;

    const toCreate = Math.max(0, DAILY_ANALYSIS_LIMIT - existing);
    for (let i = 0; i < toCreate; i += 1) {
      await prismaService.analysisJob.create({
        data: { trackId: track.id, status: 'DONE' },
      });
    }
  });

  afterEach(async () => {
    if (quotaTrackId) {
      await prismaService.track
        .delete({ where: { id: quotaTrackId } })
        .catch(() => undefined);
      quotaTrackId = null;
    }
    await app.close();
  });

  it('POST /upload is rejected with 429 once the daily limit is reached', () => {
    return request(app.getHttpServer())
      .post('/upload')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', Buffer.from('audio-bytes'), 'song.mp3')
      .expect(429);
  });

  it('POST /youtube is rejected with 429 once the daily limit is reached', () => {
    return request(app.getHttpServer())
      .post('/youtube')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'https://www.youtube.com/watch?v=abc12345678' })
      .expect(429);
  });
});
