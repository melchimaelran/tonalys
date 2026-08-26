import { Readable } from 'node:stream';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { MINIO_CLIENT } from './minio-client.provider';

describe('StorageService', () => {
  let service: StorageService;
  let client: {
    bucketExists: jest.Mock;
    makeBucket: jest.Mock;
    putObject: jest.Mock;
    removeObject: jest.Mock;
    getObject: jest.Mock;
  };

  beforeEach(async () => {
    client = {
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      putObject: jest.fn(),
      removeObject: jest.fn(),
      getObject: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: MINIO_CLIENT, useValue: client },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('tracks') },
        },
      ],
    }).compile();

    service = module.get(StorageService);
  });

  it('creates the bucket if it does not exist, then uploads the buffer', async () => {
    client.bucketExists.mockResolvedValue(false);

    const key = await service.upload('abc.mp3', Buffer.from('audio'));

    expect(client.makeBucket).toHaveBeenCalledWith('tracks');
    expect(client.putObject).toHaveBeenCalledWith(
      'tracks',
      'abc.mp3',
      expect.any(Buffer),
      expect.any(Number),
    );
    expect(key).toBe('abc.mp3');
  });

  it('does not recreate the bucket if it already exists', async () => {
    client.bucketExists.mockResolvedValue(true);

    await service.upload('abc.mp3', Buffer.from('audio'));

    expect(client.makeBucket).not.toHaveBeenCalled();
  });

  it('removes an object from the bucket', async () => {
    await service.remove('abc.mp3');

    expect(client.removeObject).toHaveBeenCalledWith('tracks', 'abc.mp3');
  });

  it('returns the object contents as a buffer', async () => {
    const stream = Readable.from([Buffer.from('hello '), Buffer.from('world')]);
    client.getObject.mockResolvedValue(stream);

    const result = await service.download('abc.mp3');

    expect(client.getObject).toHaveBeenCalledWith('tracks', 'abc.mp3');
    expect(result).toEqual(Buffer.from('hello world'));
  });
});
