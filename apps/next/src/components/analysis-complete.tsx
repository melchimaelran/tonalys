"use client";

import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { AudioPlayer } from "@/components/audio-player";
import { useTrack } from "@/hooks/use-track";

export interface AnalysisCompleteProps {
  trackId: string;
}

export function AnalysisComplete({ trackId }: AnalysisCompleteProps) {
  const track = useTrack(trackId);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {track.data && (
        <p className="text-sm font-semibold text-foreground">{track.data.title}</p>
      )}
      <AudioPlayer src={`/api/tracks/${trackId}/audio`} />
      <Link
        href={`/tracks/${trackId}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-foreground underline underline-offset-4"
      >
        Open full view
        <CaretRight aria-hidden className="size-3.5" />
      </Link>
    </div>
  );
}
