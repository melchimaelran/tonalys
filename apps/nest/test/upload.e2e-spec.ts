import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('UploadController (e2e)', () => {
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

  it('POST /upload stores the file and creates a pending Track', async () => {
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

    expect(track.title).toBe('song.mp3');
    expect(track.status).toBe('PENDING');
    expect(track.audioFileKey).toContain('song.mp3');

    const stored = await prismaService.track.findUnique({
      where: { id: track.id },
    });
    expect(stored?.status).toBe('PENDING');
  });
});
