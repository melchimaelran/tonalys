export interface ChordLabelInput {
  root: string;
  chordType: string;
  bassNote?: string | null;
}

export function formatChordLabel(chord: ChordLabelInput): string {
  const rootLabel =
    chord.bassNote && chord.bassNote !== chord.root ? `${chord.root}/${chord.bassNote}` : chord.root;

  return `${rootLabel} ${chord.chordType}`;
}
