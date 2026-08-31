export interface ChordLabelInput {
  root: string;
  chordType: string;
  bassNote?: string | null;
}

export function formatChordLabel(chord: ChordLabelInput): string {
  // "no chord detected" segments (silence, intros/outros — chord-cnn-lstm's
  // "N" label, ADR-052) — same placeholder already used when there's no
  // chord at all, rather than the literal "N none".
  if (chord.chordType === "none") {
    return "—";
  }

  const rootLabel =
    chord.bassNote && chord.bassNote !== chord.root ? `${chord.root}/${chord.bassNote}` : chord.root;

  return `${rootLabel} ${chord.chordType}`;
}
