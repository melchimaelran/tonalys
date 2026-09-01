import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UploadModule } from './upload/upload.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { YoutubeModule } from './youtube/youtube.module';
import { JobsModule } from './jobs/jobs.module';
import { TracksModule } from './tracks/tracks.module';
import { CleanupModule } from './cleanup/cleanup.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    PrismaModule,
    UploadModule,
    RabbitMQModule,
    YoutubeModule,
    JobsModule,
    TracksModule,
    CleanupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
