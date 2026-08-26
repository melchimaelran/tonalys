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

// Shifting by a multiple of 12 before the modulo keeps the result positive
// regardless of how negative `semitones` is (JS's `%` can return negative
// values otherwise).
export function transposeRoot(root: string, semitones: number): string {
  const index = noteIndex(root);
  if (index === -1) {
    return "";
  }

  return CHROMATIC_SCALE[(index + semitones + 12 * 12) % 12];
}
