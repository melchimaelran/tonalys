import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { validateEnv } from '../config/env.validation';
import { CleanupModule } from './cleanup.module';
import { CleanupService } from './cleanup.service';

// Standalone runner for the same routine the daily cron runs — for ops and
// verification. Deliberately does NOT import AppModule: no RabbitMQ
// connection, no HTTP server, no ScheduleModule (so @Cron stays dormant).
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
    CleanupModule,
  ],
})
class CleanupCliModule {}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(CleanupCliModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    const { deleted, failed } = await app
      .get(CleanupService)
      .deleteExpiredTracks();
    console.log(
      `cleanup: deleted ${deleted} expired tracks (${failed} failed)`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
