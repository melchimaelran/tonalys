import type { ChordSegment } from "@/lib/find-chord-at-time";

export interface CurrentChordDisplayProps {
  chord: ChordSegment | null;
}

export function CurrentChordDisplay({ chord }: CurrentChordDisplayProps) {
  return (
    <p role="status" aria-live="polite" className="text-2xl font-semibold">
      {chord ? `${chord.root} ${chord.chordType}` : "—"}
    </p>
  );
}
