"use client";

import { useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { AudioPlayer } from "@/components/audio-player";
import { Button } from "@/components/ui/button";
import { ChordEditForm } from "@/components/chord-edit-form";
import { CurrentChordDisplay } from "@/components/current-chord-display";
import { GuitarChordDiagram } from "@/components/guitar-chord-diagram";
import { PianoKeyboard } from "@/components/piano-keyboard";
import { UpcomingChords } from "@/components/upcoming-chords";
import { useTrack } from "@/hooks/use-track";
import { useTrackChords } from "@/hooks/use-track-chords";
import { useUpdateChordSegment } from "@/hooks/use-update-chord-segment";
import { formatChordLabel } from "@/lib/chord-label";
import { getChordNotes } from "@/lib/chord-notes";
import { computeChordProgress } from "@/lib/chord-progress";
import { findChordAtTime, findUpcomingChords, type ChordSegment } from "@/lib/find-chord-at-time";
import { getGuitarChordShape } from "@/lib/guitar-chord-shape";
import { transposeRoot } from "@/lib/notes";

type ChordView = "piano" | "guitar";

const CAPO_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7];
const TRANSPOSE_POSITIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
const UPCOMING_CHORDS_COUNT = 4;

// Transpose (piano) and capo (guitar) are plain visual shifts of the
// displayed name — never touch audio. A capo on fret N makes the shape you
// finger sound N semitones higher, so to sound the actual chord, look up
// the shape transposed DOWN by the capo position.
function resolveTransposedChord(
  chord: ChordSegment,
  view: ChordView,
  capo: number,
  transpose: number,
): { root: string; bassNote?: string | null } {
  const shift = view === "guitar" ? -capo : transpose;
  const root = transposeRoot(chord.root, shift) || chord.root;
  const bassNote = chord.bassNote ? transposeRoot(chord.bassNote, shift) || chord.bassNote : chord.bassNote;
  return { root, bassNote };
}

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
  const pianoLookup = currentChord ? resolveTransposedChord(currentChord, "piano", capo, transpose) : null;
  const highlightedNotes = currentChord && pianoLookup
    ? getChordNotes(pianoLookup.root, currentChord.chordType)
    : [];
  const guitarLookup = currentChord ? resolveTransposedChord(currentChord, "guitar", capo, transpose) : null;
  const guitarShape =
    currentChord && guitarLookup
      ? getGuitarChordShape(guitarLookup.root, currentChord.chordType, guitarLookup.bassNote)
      : null;
  const displayedChord = currentChord
    ? { ...currentChord, ...resolveTransposedChord(currentChord, view, capo, transpose) }
    : currentChord;
  const progress = currentChord ? computeChordProgress(currentChord, currentTime) : 0;
  const durationSeconds = currentChord
    ? Math.round(currentChord.endTime - currentChord.startTime)
    : undefined;
  const upcomingChords = findUpcomingChords(chords.data ?? [], currentTime, UPCOMING_CHORDS_COUNT).map(
    (chord) => ({
      id: chord.id,
      label: formatChordLabel({ ...resolveTransposedChord(chord, view, capo, transpose), chordType: chord.chordType }),
    }),
  );

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
        <div className="flex w-full flex-col items-center gap-2">
          <div className="flex w-full items-center gap-2">
            <CurrentChordDisplay chord={displayedChord} progress={progress} durationSeconds={durationSeconds} />
            {currentChord && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
              >
                <PencilSimple data-icon="inline-start" aria-hidden />
                Edit
              </Button>
            )}
          </div>
          <UpcomingChords chords={upcomingChords} />
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
