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

// chords-db only has dedicated slash-chord shape data for a hand-picked set
// of major (suffix "/<bass>") and minor (suffix "m/<bass>") combinations per
// root — not every root/bass pair, and no slash data at all for other chord
// types. When there's no dedicated shape, we fall back to the plain chord
// shape (same fretting, the bass note is just a labeling difference).
function slashSuffix(chordType: string, bassNote: string): string | null {
  if (chordType === "major") return `/${bassNote}`;
  if (chordType === "minor") return `m/${bassNote}`;
  return null;
}

export function getGuitarChordShape(
  root: string,
  chordType: string,
  bassNote?: string | null,
): GuitarChordShape | null {
  const key = ROOT_ALIASES[root] ?? root;
  const entries = chordsByKey[key];
  if (!entries) {
    return null;
  }

  if (bassNote && bassNote !== root) {
    const suffix = slashSuffix(chordType, bassNote);
    const slashMatch = suffix ? entries.find((entry) => entry.suffix === suffix) : undefined;
    if (slashMatch) {
      return slashMatch.positions[0] ?? null;
    }
  }

  const match = entries.find((entry) => entry.suffix === chordType);
  return match?.positions[0] ?? null;
}
