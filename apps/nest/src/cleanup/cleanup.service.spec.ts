import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CleanupService } from './cleanup.service';

describe('CleanupService', () => {
  let service: CleanupService;
  let findMany: jest.Mock;
  let deleteTrack: jest.Mock;
  let remove: jest.Mock;
  let get: jest.Mock;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([]);
    deleteTrack = jest.fn().mockResolvedValue(undefined);
    remove = jest.fn().mockResolvedValue(undefined);
    get = jest.fn().mockReturnValue(24);

    service = new CleanupService(
      { track: { findMany, delete: deleteTrack } } as unknown as PrismaService,
      { remove } as unknown as StorageService,
      { get } as unknown as ConfigService,
    );
  });

  it('queries non-demo tracks created before the retention cutoff', async () => {
    await service.deleteExpiredTracks();

    const [args] = findMany.mock.calls as Array<
      [{ where: { isDemo: boolean; createdAt: { lt: Date } } }]
    >;
    expect(args[0].where.isDemo).toBe(false);
    const cutoff = args[0].where.createdAt.lt.getTime();
    const expected = Date.now() - 24 * 3_600_000;
    expect(Math.abs(cutoff - expected)).toBeLessThan(5_000);
  });

  it('removes each expired track’s audio object then deletes the row', async () => {
    findMany.mockResolvedValue([
      { id: 't1', audioFileKey: 'k1.mp3' },
      { id: 't2', audioFileKey: 'k2.wav' },
    ]);

    const result = await service.deleteExpiredTracks();

    expect(remove).toHaveBeenCalledWith('k1.mp3');
    expect(remove).toHaveBeenCalledWith('k2.wav');
    expect(deleteTrack).toHaveBeenCalledWith({ where: { id: 't1' } });
    expect(deleteTrack).toHaveBeenCalledWith({ where: { id: 't2' } });
    expect(result).toEqual({ deleted: 2, failed: 0 });
  });

  it('skips storage removal for a track with no audio object', async () => {
    findMany.mockResolvedValue([{ id: 't1', audioFileKey: null }]);

    const result = await service.deleteExpiredTracks();

    expect(remove).not.toHaveBeenCalled();
    expect(deleteTrack).toHaveBeenCalledWith({ where: { id: 't1' } });
    expect(result).toEqual({ deleted: 1, failed: 0 });
  });

  it('counts a failure and moves on when one track cannot be removed', async () => {
    findMany.mockResolvedValue([
      { id: 't1', audioFileKey: 'k1.mp3' },
      { id: 't2', audioFileKey: 'k2.mp3' },
    ]);
    remove.mockImplementation((key: string) =>
      key === 'k1.mp3'
        ? Promise.reject(new Error('minio down'))
        : Promise.resolve(),
    );

    const result = await service.deleteExpiredTracks();

    expect(deleteTrack).not.toHaveBeenCalledWith({ where: { id: 't1' } });
    expect(deleteTrack).toHaveBeenCalledWith({ where: { id: 't2' } });
    expect(result).toEqual({ deleted: 1, failed: 1 });
  });

  it('honours a non-default TRACK_RETENTION_HOURS', async () => {
    get.mockReturnValue(1);

    await service.deleteExpiredTracks();

    const [args] = findMany.mock.calls as Array<
      [{ where: { createdAt: { lt: Date } } }]
    >;
    const cutoff = args[0].where.createdAt.lt.getTime();
    expect(Math.abs(cutoff - (Date.now() - 3_600_000))).toBeLessThan(5_000);
  });

  it('does nothing when no track is expired', async () => {
    const result = await service.deleteExpiredTracks();

    expect(remove).not.toHaveBeenCalled();
    expect(deleteTrack).not.toHaveBeenCalled();
    expect(result).toEqual({ deleted: 0, failed: 0 });
  });
});
