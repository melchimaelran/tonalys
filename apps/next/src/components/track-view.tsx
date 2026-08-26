"use client";

import { useState } from "react";
import { AudioPlayer } from "@/components/audio-player";
import { Button } from "@/components/ui/button";
import { CurrentChordDisplay } from "@/components/current-chord-display";
import { GuitarChordDiagram } from "@/components/guitar-chord-diagram";
import { PianoKeyboard } from "@/components/piano-keyboard";
import { useTrack } from "@/hooks/use-track";
import { useTrackChords } from "@/hooks/use-track-chords";
import { getChordNotes } from "@/lib/chord-notes";
import { findChordAtTime } from "@/lib/find-chord-at-time";
import { getGuitarChordShape } from "@/lib/guitar-chord-shape";
import { transposeRoot } from "@/lib/notes";

type ChordView = "piano" | "guitar";

const CAPO_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7];

export interface TrackViewProps {
  trackId: string;
}

export function TrackView({ trackId }: TrackViewProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [view, setView] = useState<ChordView>("piano");
  const [capo, setCapo] = useState(0);
  const track = useTrack(trackId);
  const chords = useTrackChords(trackId);
  const currentChord = findChordAtTime(chords.data ?? [], currentTime);
  const highlightedNotes = currentChord
    ? getChordNotes(currentChord.root, currentChord.chordType)
    : [];
  // A capo on fret N makes the shape you finger sound N semitones higher —
  // so to sound the actual chord, look up the shape transposed DOWN by the
  // capo position. Purely a different lookup name; never touches audio.
  const guitarLookupRoot = currentChord ? transposeRoot(currentChord.root, -capo) || currentChord.root : "";
  const guitarShape = currentChord
    ? getGuitarChordShape(guitarLookupRoot, currentChord.chordType)
    : null;
  // Piano has no transpose control yet (TON-032) — it always shows the real
  // chord. Guitar shows the capo-transposed name, matching the shape below.
  const displayedChord =
    currentChord && view === "guitar"
      ? { ...currentChord, root: guitarLookupRoot }
      : currentChord;

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6">
      {track.data && <h1 className="text-lg font-semibold">{track.data.title}</h1>}
      <CurrentChordDisplay chord={displayedChord} />
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
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <label htmlFor="capo-select" className="text-xs font-medium text-muted-foreground">
              Capo
            </label>
            <select
              id="capo-select"
              aria-label="Capo"
              value={capo}
              onChange={(event) => setCapo(Number(event.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            >
              {CAPO_POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>
          <GuitarChordDiagram shape={guitarShape} />
        </div>
      )}
      <AudioPlayer src={`/api/tracks/${trackId}/audio`} onTimeUpdate={setCurrentTime} />
    </div>
  );
}
