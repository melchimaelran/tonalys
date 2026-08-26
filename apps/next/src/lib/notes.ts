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
