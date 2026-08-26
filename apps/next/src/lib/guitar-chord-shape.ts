import guitarChords from "@tombatossals/chords-db/lib/guitar.json";

// chords-db's `chords` object doesn't key sharps the way its `keys` display
// list suggests: D#/G#/A# are stored under their flat spelling (Eb/Ab/Bb,
// matching standard guitar chord chart convention), while C#/F# are stored
// under the literal strings "Csharp"/"Fsharp" (no "#" in the actual key).
// Essentia/our pipeline always emits sharps, so every one of the five
// possible sharp roots needs an alias here.
const ROOT_ALIASES: Record<string, string> = {
  "C#": "Csharp",
  "D#": "Eb",
  "F#": "Fsharp",
  "G#": "Ab",
  "A#": "Bb",
};

export interface GuitarChordShape {
  frets: number[];
  fingers: number[];
  baseFret: number;
  barres: number[];
}

interface ChordsDbEntry {
  suffix: string;
  positions: GuitarChordShape[];
}

const chordsByKey = guitarChords.chords as Record<string, ChordsDbEntry[]>;

export const GUITAR_STRING_COUNT = guitarChords.main.strings;
export const GUITAR_FRETS_ON_CHORD = guitarChords.main.fretsOnChord;

export function getGuitarChordShape(root: string, chordType: string): GuitarChordShape | null {
  const key = ROOT_ALIASES[root] ?? root;
  const entries = chordsByKey[key];
  if (!entries) {
    return null;
  }

  const match = entries.find((entry) => entry.suffix === chordType);
  return match?.positions[0] ?? null;
}
