import { Injectable } from '@nestjs/common';
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
    const response = await fetch(
      `${workerUrl}/youtube/info?url=${encodeURIComponent(url)}`,
    );
    const data = (await response.json()) as WorkerYoutubeInfoResponse;

    return {
      available: data.available,
      title: data.title,
      durationSeconds: data.duration_seconds,
    };
  }
}
