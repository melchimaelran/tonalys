import guitarChords from "@tombatossals/chords-db/lib/guitar.json";

// chords-db spells accidentals as flats for these roots (matches standard
// guitar chord chart convention) — Essentia/our pipeline always emits sharps.
const ROOT_ALIASES: Record<string, string> = {
  "D#": "Eb",
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
