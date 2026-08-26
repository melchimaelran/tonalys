import type { ChordSegment } from "@/lib/find-chord-at-time";

export interface CurrentChordDisplayProps {
  chord: ChordSegment | null;
}

export function CurrentChordDisplay({ chord }: CurrentChordDisplayProps) {
  const root =
    chord?.bassNote && chord.bassNote !== chord.root
      ? `${chord.root}/${chord.bassNote}`
      : chord?.root;

  return (
    <p role="status" aria-live="polite" className="text-2xl font-semibold">
      {chord ? `${root} ${chord.chordType}` : "—"}
    </p>
  );
}
