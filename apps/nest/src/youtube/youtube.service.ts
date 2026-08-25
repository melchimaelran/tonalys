import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface YoutubeVideoInfo {
  available: boolean;
  title: string | null;
  durationSeconds: number | null;
}

interface WorkerYoutubeInfoResponse {
  available: boolean;
  title: string | null;
  duration_seconds: number | null;
}

@Injectable()
export class YoutubeService {
  constructor(private readonly configService: ConfigService) {}

  async getVideoInfo(url: string): Promise<YoutubeVideoInfo> {
    const workerUrl = this.configService.get<string>('WORKER_URL')!;
    let response: Response;

    try {
      response = await fetch(
        `${workerUrl}/youtube/info?url=${encodeURIComponent(url)}`,
      );
    } catch {
      // Worker unreachable (down, network blip) — a clear 503 beats an
      // unhandled fetch error surfacing as an opaque 500.
      throw new ServiceUnavailableException(
        'Unable to reach the analysis service, please try again shortly',
      );
    }

    const data = (await response.json()) as WorkerYoutubeInfoResponse;

    return {
      available: data.available,
      title: data.title,
      durationSeconds: data.duration_seconds,
    };
  }
}
