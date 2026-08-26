"use client";

import { useState } from "react";
import { AudioPlayer } from "@/components/audio-player";
import { CurrentChordDisplay } from "@/components/current-chord-display";
import { useTrackChords } from "@/hooks/use-track-chords";

export interface TrackViewProps {
  trackId: string;
}

export function TrackView({ trackId }: TrackViewProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const chords = useTrackChords(trackId);

  return (
    <div className="flex flex-col items-center gap-6">
      <CurrentChordDisplay segments={chords.data ?? []} currentTime={currentTime} />
      <AudioPlayer src={`/api/tracks/${trackId}/audio`} onTimeUpdate={setCurrentTime} />
    </div>
  );
}
