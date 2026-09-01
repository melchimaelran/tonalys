import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { StorageModule } from '../storage/storage.module';
import { DailyQuotaGuard } from '../quota/daily-quota.guard';

@Module({
  imports: [StorageModule],
  controllers: [UploadController],
  providers: [DailyQuotaGuard],
})
export class UploadModule {}
