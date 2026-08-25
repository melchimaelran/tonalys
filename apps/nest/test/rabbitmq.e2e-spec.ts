import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as amqp from 'amqplib';
import { AppModule } from './../src/app.module';
import {
  ANALYSIS_JOBS_QUEUE,
  RabbitMQService,
} from './../src/rabbitmq/rabbitmq.service';

describe('RabbitMQService (e2e)', () => {
  let app: INestApplication;
  let rabbitMQService: RabbitMQService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    rabbitMQService = app.get(RabbitMQService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('publishes a message a real consumer can receive from the analysis_jobs queue', async () => {
    const connection = await amqp.connect(process.env.RABBITMQ_URL!);
    try {
      const channel = await connection.createChannel();
      try {
        await channel.assertQueue(ANALYSIS_JOBS_QUEUE, { durable: true });
        await channel.purgeQueue(ANALYSIS_JOBS_QUEUE);

        const payload = { trackId: 'track-e2e-test', status: 'pending' };
        rabbitMQService.publish(payload);

        const received = await new Promise<Record<string, unknown>>(
          (resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error('timed out waiting for message')),
              5000,
            );
            void channel.consume(ANALYSIS_JOBS_QUEUE, (msg) => {
              if (!msg) return;
              clearTimeout(timeout);
              channel.ack(msg);
              resolve(
                JSON.parse(msg.content.toString()) as Record<string, unknown>,
              );
            });
          },
        );

        expect(received).toEqual(payload);
      } finally {
        await channel.close();
      }
    } finally {
      await connection.close();
    }
  });
});
