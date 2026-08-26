"use client";

import { useState } from "react";
import { AudioPlayer } from "@/components/audio-player";
import { CurrentChordDisplay } from "@/components/current-chord-display";
import { PianoKeyboard } from "@/components/piano-keyboard";
import { useTrackChords } from "@/hooks/use-track-chords";
import { getChordNotes } from "@/lib/chord-notes";
import { findChordAtTime } from "@/lib/find-chord-at-time";

export interface TrackViewProps {
  trackId: string;
}

export function TrackView({ trackId }: TrackViewProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const chords = useTrackChords(trackId);
  const currentChord = findChordAtTime(chords.data ?? [], currentTime);
  const highlightedNotes = currentChord
    ? getChordNotes(currentChord.root, currentChord.chordType)
    : [];

  return (
    <div className="flex flex-col items-center gap-6">
      <CurrentChordDisplay chord={currentChord} />
      <PianoKeyboard highlightedNotes={highlightedNotes} />
      <AudioPlayer src={`/api/tracks/${trackId}/audio`} onTimeUpdate={setCurrentTime} />
    </div>
  );
}
