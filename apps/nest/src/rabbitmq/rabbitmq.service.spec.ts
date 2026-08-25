import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { ANALYSIS_JOBS_QUEUE, RabbitMQService } from './rabbitmq.service';

jest.mock('amqplib');

describe('RabbitMQService', () => {
  let service: RabbitMQService;
  let configService: ConfigService;
  let channel: {
    assertQueue: jest.Mock;
    sendToQueue: jest.Mock;
    close: jest.Mock;
  };
  let connection: { createChannel: jest.Mock; close: jest.Mock };

  beforeEach(() => {
    channel = {
      assertQueue: jest.fn().mockResolvedValue(undefined),
      sendToQueue: jest.fn().mockReturnValue(true),
      close: jest.fn().mockResolvedValue(undefined),
    };
    connection = {
      createChannel: jest.fn().mockResolvedValue(channel),
      close: jest.fn().mockResolvedValue(undefined),
    };
    (amqp.connect as jest.Mock).mockResolvedValue(connection);

    configService = {
      get: jest.fn().mockReturnValue('amqp://localhost:5672'),
    } as unknown as ConfigService;

    service = new RabbitMQService(configService);
  });

  it('connects and asserts the durable analysis_jobs queue on init', async () => {
    await service.onModuleInit();

    expect(amqp.connect).toHaveBeenCalledWith('amqp://localhost:5672');
    expect(connection.createChannel).toHaveBeenCalled();
    expect(channel.assertQueue).toHaveBeenCalledWith(ANALYSIS_JOBS_QUEUE, {
      durable: true,
    });
  });

  it('closes the channel and connection on destroy', async () => {
    await service.onModuleInit();

    await service.onModuleDestroy();

    expect(channel.close).toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalled();
  });

  it('publishes a JSON-serialized, persistent message to the queue', async () => {
    await service.onModuleInit();

    service.publish({ jobId: 'job-1' });

    expect(channel.sendToQueue).toHaveBeenCalledWith(
      ANALYSIS_JOBS_QUEUE,
      Buffer.from(JSON.stringify({ jobId: 'job-1' })),
      { persistent: true },
    );
  });

  it('throws if publish is called before the channel is initialized', () => {
    expect(() => service.publish({ jobId: 'job-1' })).toThrow();
  });

  it('closes the connection if channel setup fails after connect succeeds', async () => {
    channel.assertQueue.mockRejectedValue(new Error('queue setup failed'));

    await expect(service.onModuleInit()).rejects.toThrow('queue setup failed');

    expect(connection.close).toHaveBeenCalled();
  });
});
