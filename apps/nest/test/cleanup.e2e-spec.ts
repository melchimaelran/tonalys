import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { StorageService } from './../src/storage/storage.service';
import { CleanupService } from './../src/cleanup/cleanup.service';

const OLD = new Date('2020-01-01T00:00:00Z');

describe('CleanupService (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let storage: StorageService;
  let cleanup: CleanupService;
  const createdTrackIds: string[] = [];
  const uploadedKeys: string[] = [];

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    storage = app.get(StorageService);
    cleanup = app.get(CleanupService);
  });

  afterEach(async () => {
    if (createdTrackIds.length > 0) {
      await prisma.track.deleteMany({ where: { id: { in: createdTrackIds } } });
      createdTrackIds.length = 0;
    }
    await Promise.all(
      uploadedKeys.map((key) => storage.remove(key).catch(() => undefined)),
    );
    uploadedKeys.length = 0;
    await app.close();
  });

  it('deletes only expired non-demo tracks — DB rows, cascaded children and MinIO object', async () => {
    const audioKey = `${randomUUID()}.mp3`;
    await storage.upload(audioKey, Buffer.from('audio'));
    uploadedKeys.push(audioKey);

    const oldNonDemo = await prisma.track.create({
      data: {
        title: 'Old one-shot',
        sourceType: 'UPLOAD',
        status: 'READY',
        isDemo: false,
        audioFileKey: audioKey,
        createdAt: OLD,
        chordSegments: {
          create: [{ startTime: 0, endTime: 2, root: 'C', chordType: 'major' }],
        },
        analysisJobs: { create: [{ status: 'DONE' }] },
      },
    });
    const freshNonDemo = await prisma.track.create({
      data: {
        title: 'Fresh',
        sourceType: 'UPLOAD',
        status: 'READY',
        isDemo: false,
      },
    });
    const oldDemo = await prisma.track.create({
      data: {
        title: 'Old demo',
        sourceType: 'UPLOAD',
        status: 'READY',
        isDemo: true,
        createdAt: OLD,
      },
    });
    createdTrackIds.push(oldNonDemo.id, freshNonDemo.id, oldDemo.id);

    const result = await cleanup.deleteExpiredTracks();

    expect(result.deleted).toBeGreaterThanOrEqual(1);
    expect(result.failed).toBe(0);

    expect(
      await prisma.track.findUnique({ where: { id: oldNonDemo.id } }),
    ).toBeNull();
    expect(
      await prisma.chordSegment.count({ where: { trackId: oldNonDemo.id } }),
    ).toBe(0);
    expect(
      await prisma.analysisJob.count({ where: { trackId: oldNonDemo.id } }),
    ).toBe(0);
    await expect(storage.download(audioKey)).rejects.toBeDefined();

    expect(
      await prisma.track.findUnique({ where: { id: freshNonDemo.id } }),
    ).not.toBeNull();
    expect(
      await prisma.track.findUnique({ where: { id: oldDemo.id } }),
    ).not.toBeNull();
  });
});
