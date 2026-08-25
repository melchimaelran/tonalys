import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('JobsController (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;
  let accessToken: string;
  const createdTrackIds: string[] = [];

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
  });

  afterEach(async () => {
    if (createdTrackIds.length > 0) {
      await prismaService.track.deleteMany({
        where: { id: { in: createdTrackIds } },
      });
      createdTrackIds.length = 0;
    }
    await app.close();
  });

  it('GET /jobs/:id returns 401 without a token', () => {
    return request(app.getHttpServer())
      .get(`/jobs/${randomUUID()}`)
      .expect(401);
  });

  it('GET /jobs/:id returns 404 for an unknown job', () => {
    return request(app.getHttpServer())
      .get(`/jobs/${randomUUID()}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it('GET /jobs/:id returns the job status', async () => {
    const track = await prismaService.track.create({
      data: {
        title: 'Test track',
        sourceType: 'UPLOAD',
        status: 'PROCESSING',
      },
    });
    createdTrackIds.push(track.id);
    const job = await prismaService.analysisJob.create({
      data: { trackId: track.id, status: 'PROCESSING' },
    });

    const response = await request(app.getHttpServer())
      .get(`/jobs/${job.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({
      id: job.id,
      trackId: track.id,
      status: 'PROCESSING',
      errorMessage: null,
    });
  });
});
