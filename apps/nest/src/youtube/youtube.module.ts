import { Module } from '@nestjs/common';
import { YoutubeController } from './youtube.controller';
import { YoutubeService } from './youtube.service';
import { DailyQuotaGuard } from '../quota/daily-quota.guard';

@Module({
  controllers: [YoutubeController],
  providers: [YoutubeService, DailyQuotaGuard],
})
export class YoutubeModule {}
