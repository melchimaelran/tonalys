import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

export const ANALYSIS_JOBS_QUEUE = 'analysis_jobs';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection?: amqp.ChannelModel;
  private channel?: amqp.Channel;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.get<string>('RABBITMQ_URL')!;
    this.connection = await amqp.connect(url);

    try {
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(ANALYSIS_JOBS_QUEUE, { durable: true });
    } catch (error) {
      await this.connection.close();
      this.connection = undefined;
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => undefined);
    await this.connection?.close();
  }

  publish(payload: Record<string, unknown>): void {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    this.channel.sendToQueue(
      ANALYSIS_JOBS_QUEUE,
      Buffer.from(JSON.stringify(payload)),
      { persistent: true },
    );
  }
}
