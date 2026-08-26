import { findChordAtTime, type ChordSegment } from "@/lib/find-chord-at-time";

export interface CurrentChordDisplayProps {
  segments: ChordSegment[];
  currentTime: number;
}

export function CurrentChordDisplay({ segments, currentTime }: CurrentChordDisplayProps) {
  const chord = findChordAtTime(segments, currentTime);

  return (
    <p role="status" aria-live="polite" className="text-2xl font-semibold">
      {chord ? `${chord.root} ${chord.chordType}` : "—"}
    </p>
  );
}
