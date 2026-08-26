export const CHROMATIC_SCALE = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

const FLAT_ALIASES: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

// Common chord-chart vocabulary a manual correction might need — a curated
// subset of what chords-db actually has shape data for (it has ~50
// suffixes per root, most of them rare altered/extended variants). Every
// entry here is a literal chords-db suffix string, so it can be passed
// straight through to getGuitarChordShape without translation. The piano
// only visually supports the first 13 of these (see chord-notes.ts) —
// the 9th-family ones still work for editing/guitar/text display.
export const CHORD_TYPES = [
  "major",
  "minor",
  "dim",
  "dim7",
  "aug",
  "sus2",
  "sus4",
  "6",
  "m6",
  "7",
  "m7",
  "maj7",
  "mmaj7",
  "9",
  "maj9",
  "m9",
  "add9",
];

export function noteIndex(note: string): number {
  return CHROMATIC_SCALE.indexOf(FLAT_ALIASES[note] ?? note);
}

// A second `% 12 + 12) % 12` keeps the result positive regardless of how
// negative `semitones` is (JS's `%` can return negative values otherwise,
// and a fixed positive offset isn't enough for arbitrarily large shifts).
export function transposeRoot(root: string, semitones: number): string {
  const index = noteIndex(root);
  if (index === -1) {
    return "";
  }

  return CHROMATIC_SCALE[(((index + semitones) % 12) + 12) % 12];
}
