import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

const TERMINAL_STATUSES = ['DONE', 'ERROR'];

async function waitForTerminalStatus(
  prismaService: PrismaService,
  jobId: string,
  timeoutMs = 15000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await prismaService.analysisJob.findUniqueOrThrow({
      where: { id: jobId },
    });
    if (TERMINAL_STATUSES.includes(job.status)) return job.status;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('timed out waiting for the job to reach a terminal status');
}

// These hit the real worker (WORKER_URL) which in turn hits the real
// YouTube network (yt-dlp, no mock — see ADR-040) — needs the worker
// actually running (native `uvicorn`, ADR-031 daily loop, or the
// dockerized service) during this suite, not just Postgres/RabbitMQ.
const STABLE_TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
const NONEXISTENT_VIDEO_URL = 'https://www.youtube.com/watch?v=00000000000';

describe('YoutubeController (e2e)', () => {
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

  it('POST /youtube returns 401 without a token', () => {
    return request(app.getHttpServer())
      .post('/youtube')
      .send({ url: STABLE_TEST_VIDEO_URL })
      .expect(401);
  });

  it('POST /youtube rejects a malformed URL', () => {
    return request(app.getHttpServer())
      .post('/youtube')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: 'not a url' })
      .expect(400);
  });

  it('POST /youtube rejects an unavailable video', () => {
    return request(app.getHttpServer())
      .post('/youtube')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: NONEXISTENT_VIDEO_URL })
      .expect(400);
  });

  it('POST /youtube creates a pending Track + AnalysisJob and publishes to the queue for a valid link', async () => {
    // Real network round-trip through the worker to YouTube (yt-dlp
    // metadata lookup) — slower than the default 5s Jest timeout. Message
    // delivery is verified by polling Postgres for the job leaving
    // PENDING (the real worker picks it up), not by this test consuming
    // the RabbitMQ message itself — a live worker is already consuming
    // that queue, and RabbitMQ delivers each message to exactly one
    // consumer, so racing it here would just flake (same caveat as
    // apps/worker's own tests, ADR-035).
    const response = await request(app.getHttpServer())
      .post('/youtube')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ url: STABLE_TEST_VIDEO_URL })
      .expect(201);

    const track = response.body as {
      id: string;
      title: string;
      status: string;
      sourceUrl: string;
      jobId: string;
    };
    createdTrackIds.push(track.id);

    expect(track.status).toBe('PENDING');
    expect(track.sourceUrl).toBe(STABLE_TEST_VIDEO_URL);

    const analysisJobs = await prismaService.analysisJob.findMany({
      where: { trackId: track.id },
    });
    expect(analysisJobs).toHaveLength(1);
    expect(track.jobId).toBe(analysisJobs[0]?.id);
    // Not asserting the job is still PENDING here — with a live worker
    // (needed for this test in the first place) it can already be
    // PROCESSING or even ERROR by the time this query runs (TON-023
    // marks PROCESSING as soon as the worker picks the message up).

    // The worker did receive and process the message (proving Nest
    // published it correctly) — it lands on ERROR here rather than DONE
    // because YouTube tracks aren't wired into the consumer's download
    // step yet (no audio_file_key to fetch from MinIO), a known,
    // separate gap tracked outside this ticket's scope.
    const finalStatus = await waitForTerminalStatus(prismaService, track.jobId);
    expect(finalStatus).toBe('ERROR');
  }, 20000);
});
