import { ConfigService } from '@nestjs/config';
import { YoutubeService } from './youtube.service';

describe('YoutubeService', () => {
  let service: YoutubeService;
  let configService: { get: jest.Mock };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    configService = { get: jest.fn().mockReturnValue('http://worker:8000') };
    service = new YoutubeService(configService as unknown as ConfigService);
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('calls the worker info endpoint with the URL-encoded video URL', async () => {
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({
          available: true,
          title: 'Song',
          duration_seconds: 180,
        }),
    });

    await service.getVideoInfo('https://www.youtube.com/watch?v=abc12345678');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://worker:8000/youtube/info?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabc12345678',
    );
  });

  it('maps the worker snake_case response to camelCase', async () => {
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({
          available: true,
          title: 'Song',
          duration_seconds: 180,
        }),
    });

    const info = await service.getVideoInfo('https://youtu.be/abc12345678');

    expect(info).toEqual({
      available: true,
      title: 'Song',
      durationSeconds: 180,
    });
  });

  it('passes through an unavailable result', async () => {
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({
          available: false,
          title: null,
          duration_seconds: null,
        }),
    });

    const info = await service.getVideoInfo('https://youtu.be/00000000000');

    expect(info).toEqual({
      available: false,
      title: null,
      durationSeconds: null,
    });
  });
});
