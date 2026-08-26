import { Module } from '@nestjs/common';
import { TracksController } from './tracks.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [TracksController],
})
export class TracksModule {}
