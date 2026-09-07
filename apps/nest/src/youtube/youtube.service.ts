import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type YoutubeUnavailableReason = 'blocked' | 'unavailable';

export interface YoutubeVideoInfo {
  available: boolean;
  title: string | null;
  durationSeconds: number | null;
  // Only set when available is false. "blocked" = YouTube is refusing the
  // worker's IP/session (transient, our side); "unavailable" = the video
  // itself is private/removed/invalid.
  reason: YoutubeUnavailableReason | null;
}

interface WorkerYoutubeInfoResponse {
  available: boolean;
  title: string | null;
  duration_seconds: number | null;
  reason?: YoutubeUnavailableReason | null;
}

@Injectable()
export class YoutubeService {
  constructor(private readonly configService: ConfigService) {}

  async getVideoInfo(url: string): Promise<YoutubeVideoInfo> {
    const workerUrl = this.configService.get<string>('WORKER_URL')!;
    let data: WorkerYoutubeInfoResponse;

    try {
      const response = await fetch(
        `${workerUrl}/youtube/info?url=${encodeURIComponent(url)}`,
      );
      data = (await response.json()) as WorkerYoutubeInfoResponse;
    } catch {
      // Worker unreachable, or an unexpected non-JSON/error response —
      // a clear 503 beats an unhandled error surfacing as an opaque 500.
      throw new ServiceUnavailableException(
        'Unable to reach the analysis service, please try again shortly',
      );
    }

    return {
      available: data.available,
      title: data.title,
      durationSeconds: data.duration_seconds,
      reason: data.available ? null : (data.reason ?? 'unavailable'),
    };
  }
}
