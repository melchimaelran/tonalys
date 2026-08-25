import { IsNotEmpty, IsString, Matches } from 'class-validator';

// Mirrors the client-side pattern in apps/next's YoutubeLinkForm — www is
// only ever valid on youtube.com, youtu.be has no www subdomain.
export const YOUTUBE_URL_PATTERN =
  /^https?:\/\/((www\.)?youtube\.com\/watch\?v=[\w-]{11}(&\S*)?|youtu\.be\/[\w-]{11}(\?\S*)?)$/;

export class CreateYoutubeTrackDto {
  @IsString()
  @IsNotEmpty()
  @Matches(YOUTUBE_URL_PATTERN, {
    message: 'url must be a valid YouTube video URL',
  })
  url!: string;
}
