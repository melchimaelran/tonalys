import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  // Non-demo tracks are one-shot analyses — keep them only briefly, then
  // reclaim the disk. Deletes the MinIO object first (best-effort,
  // idempotent) then the Track row; the onDelete: Cascade on ChordSegment
  // and AnalysisJob removes their children. Per-track so one failure only
  // skips that track — it's retried on the next run.
  async deleteExpiredTracks(): Promise<{ deleted: number; failed: number }> {
    const hours = this.config.get<number>('TRACK_RETENTION_HOURS') ?? 24;
    const cutoff = new Date(Date.now() - hours * HOUR_MS);

    const expired = await this.prisma.track.findMany({
      where: { isDemo: false, createdAt: { lt: cutoff } },
      select: { id: true, audioFileKey: true },
    });

    let deleted = 0;
    let failed = 0;

    for (const track of expired) {
      try {
        if (track.audioFileKey) {
          await this.storage.remove(track.audioFileKey);
        }
        await this.prisma.track.delete({ where: { id: track.id } });
        deleted += 1;
      } catch (error) {
        failed += 1;
        this.logger.warn(
          `cleanup: failed on track ${track.id}: ${String(error)}`,
        );
      }
    }

    return { deleted, failed };
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron(): Promise<void> {
    try {
      const { deleted, failed } = await this.deleteExpiredTracks();
      this.logger.log(
        `cleanup: deleted ${deleted} expired tracks (${failed} failed)`,
      );
    } catch (error) {
      this.logger.error(`cleanup: run failed: ${String(error)}`);
    }
  }
}
