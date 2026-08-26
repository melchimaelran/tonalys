"use client";

import { useState } from "react";
import { AudioPlayer } from "@/components/audio-player";
import { Button } from "@/components/ui/button";
import { CurrentChordDisplay } from "@/components/current-chord-display";
import { GuitarChordDiagram } from "@/components/guitar-chord-diagram";
import { PianoKeyboard } from "@/components/piano-keyboard";
import { useTrackChords } from "@/hooks/use-track-chords";
import { getChordNotes } from "@/lib/chord-notes";
import { findChordAtTime } from "@/lib/find-chord-at-time";
import { getGuitarChordShape } from "@/lib/guitar-chord-shape";

type ChordView = "piano" | "guitar";

export interface TrackViewProps {
  trackId: string;
}

export function TrackView({ trackId }: TrackViewProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [view, setView] = useState<ChordView>("piano");
  const chords = useTrackChords(trackId);
  const currentChord = findChordAtTime(chords.data ?? [], currentTime);
  const highlightedNotes = currentChord
    ? getChordNotes(currentChord.root, currentChord.chordType)
    : [];
  const guitarShape = currentChord
    ? getGuitarChordShape(currentChord.root, currentChord.chordType)
    : null;

  return (
    <div className="flex flex-col items-center gap-6">
      <CurrentChordDisplay chord={currentChord} />
      <div className="flex gap-2" role="tablist" aria-label="Chord view">
        <Button
          type="button"
          variant={view === "piano" ? "default" : "outline"}
          size="sm"
          role="tab"
          aria-selected={view === "piano"}
          onClick={() => setView("piano")}
        >
          Piano
        </Button>
        <Button
          type="button"
          variant={view === "guitar" ? "default" : "outline"}
          size="sm"
          role="tab"
          aria-selected={view === "guitar"}
          onClick={() => setView("guitar")}
        >
          Guitar
        </Button>
      </div>
      {view === "piano" ? (
        <PianoKeyboard highlightedNotes={highlightedNotes} />
      ) : (
        <GuitarChordDiagram shape={guitarShape} />
      )}
      <AudioPlayer src={`/api/tracks/${trackId}/audio`} onTimeUpdate={setCurrentTime} />
    </div>
  );
}
