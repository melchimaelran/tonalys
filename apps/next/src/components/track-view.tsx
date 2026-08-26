"use client";

import { useState } from "react";
import { AudioPlayer } from "@/components/audio-player";
import { Button } from "@/components/ui/button";
import { ChordEditForm } from "@/components/chord-edit-form";
import { CurrentChordDisplay } from "@/components/current-chord-display";
import { GuitarChordDiagram } from "@/components/guitar-chord-diagram";
import { PianoKeyboard } from "@/components/piano-keyboard";
import { useTrack } from "@/hooks/use-track";
import { useTrackChords } from "@/hooks/use-track-chords";
import { useUpdateChordSegment } from "@/hooks/use-update-chord-segment";
import { getChordNotes } from "@/lib/chord-notes";
import { findChordAtTime } from "@/lib/find-chord-at-time";
import { getGuitarChordShape } from "@/lib/guitar-chord-shape";
import { transposeRoot } from "@/lib/notes";

type ChordView = "piano" | "guitar";

const CAPO_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7];
const TRANSPOSE_POSITIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

export interface TrackViewProps {
  trackId: string;
}

export function TrackView({ trackId }: TrackViewProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [view, setView] = useState<ChordView>("piano");
  const [capo, setCapo] = useState(0);
  const [transpose, setTranspose] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const track = useTrack(trackId);
  const chords = useTrackChords(trackId);
  const updateChordSegment = useUpdateChordSegment(trackId);
  const currentChord = findChordAtTime(chords.data ?? [], currentTime);
  // Transpose is a plain visual shift of the displayed name/notes — never
  // touches audio.
  const pianoLookupRoot = currentChord
    ? transposeRoot(currentChord.root, transpose) || currentChord.root
    : "";
  const highlightedNotes = currentChord
    ? getChordNotes(pianoLookupRoot, currentChord.chordType)
    : [];
  // A capo on fret N makes the shape you finger sound N semitones higher —
  // so to sound the actual chord, look up the shape transposed DOWN by the
  // capo position. Purely a different lookup name; never touches audio.
  const guitarLookupRoot = currentChord ? transposeRoot(currentChord.root, -capo) || currentChord.root : "";
  const guitarShape = currentChord
    ? getGuitarChordShape(guitarLookupRoot, currentChord.chordType, currentChord.bassNote)
    : null;
  const displayedChord = currentChord
    ? { ...currentChord, root: view === "guitar" ? guitarLookupRoot : pianoLookupRoot }
    : currentChord;

  return (
    <div className="flex w-full max-w-2xl flex-col items-center gap-6">
      {track.data && <h1 className="text-lg font-semibold">{track.data.title}</h1>}
      {isEditing && currentChord ? (
        <div className="flex flex-col items-center gap-1">
          <ChordEditForm
            root={currentChord.root}
            chordType={currentChord.chordType}
            bassNote={currentChord.bassNote}
            isSaving={updateChordSegment.isPending}
            onSave={(root, chordType, bassNote) => {
              updateChordSegment.mutate(
                { segmentId: currentChord.id, root, chordType, bassNote },
                { onSuccess: () => setIsEditing(false) },
              );
            }}
            onCancel={() => setIsEditing(false)}
          />
          {updateChordSegment.isError && (
            <p className="text-xs text-destructive">{updateChordSegment.error.message}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <CurrentChordDisplay chord={displayedChord} />
          {currentChord && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>
      )}
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
        <div className="flex w-full flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <label
              htmlFor="transpose-select"
              className="text-xs font-medium text-muted-foreground"
            >
              Transpose
            </label>
            <select
              id="transpose-select"
              aria-label="Transpose"
              value={transpose}
              onChange={(event) => setTranspose(Number(event.target.value))}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
            >
              {TRANSPOSE_POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position > 0 ? `+${position}` : position}
                </option>
              ))}
            </select>
          </div>
          <PianoKeyboard highlightedNotes={highlightedNotes} />
        </div>
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
