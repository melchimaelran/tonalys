import {
  CanActivate,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// App-wide cap on new analyses per UTC day. There is no user model, so this
// is deliberately a single global counter, not per-IP / per-account.
export const DAILY_ANALYSIS_LIMIT = 18;

@Injectable()
export class DailyQuotaGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(): Promise<boolean> {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);

    const count = await this.prisma.analysisJob.count({
      where: { createdAt: { gte: since } },
    });

    if (count >= DAILY_ANALYSIS_LIMIT) {
      throw new HttpException(
        'Daily analysis limit reached — try again tomorrow',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
