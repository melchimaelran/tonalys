import { PrismaService } from '../prisma/prisma.service';
import { DailyQuotaGuard, DAILY_ANALYSIS_LIMIT } from './daily-quota.guard';

describe('DailyQuotaGuard', () => {
  let guard: DailyQuotaGuard;
  let count: jest.Mock;

  beforeEach(() => {
    count = jest.fn();
    guard = new DailyQuotaGuard({
      analysisJob: { count },
    } as unknown as PrismaService);
  });

  it('allows the request when today’s count is below the limit', async () => {
    count.mockResolvedValue(DAILY_ANALYSIS_LIMIT - 1);

    await expect(guard.canActivate()).resolves.toBe(true);
  });

  it('counts only analysis jobs created since 00:00 UTC today', async () => {
    count.mockResolvedValue(0);

    await guard.canActivate();

    const [args] = count.mock.calls as Array<
      [{ where: { createdAt: { gte: Date } } }]
    >;
    const since = args[0].where.createdAt.gte;
    expect(since.getUTCHours()).toBe(0);
    expect(since.getUTCMinutes()).toBe(0);
    expect(since.getUTCSeconds()).toBe(0);
    expect(since.getUTCMilliseconds()).toBe(0);
    expect(since.getUTCDate()).toBe(new Date().getUTCDate());
  });

  it('throws 429 when the daily limit is reached', async () => {
    count.mockResolvedValue(DAILY_ANALYSIS_LIMIT);

    await expect(guard.canActivate()).rejects.toMatchObject({ status: 429 });
  });
});
