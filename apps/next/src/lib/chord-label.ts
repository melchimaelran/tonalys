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

  // Slash-chord notation: the full chord (root + type) is the left side of
  // the slash, the bass note is the whole right side — "C major/F" is a C
  // major triad played over an F bass, read "C over F". The bass note is
  // never inserted between the root and the chord type.
  const chordLabel = `${chord.root} ${chord.chordType}`;

  return chord.bassNote && chord.bassNote !== chord.root
    ? `${chordLabel}/${chord.bassNote}`
    : chordLabel;
}
