const CHROMATIC_SCALE = [
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

const TRIAD_INTERVALS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
};

function noteIndex(note: string): number {
  return CHROMATIC_SCALE.indexOf(FLAT_ALIASES[note] ?? note);
}

export interface VoicedNote {
  note: string;
  octave: number;
}

// Notes climb from the root in ascending pitch order (matching the
// interval tables' own ascending order) rather than all collapsing onto
// the same pitch class — each chord tone lights up exactly once, in
// whichever of the two rendered octaves it actually falls in.
export function getChordNotes(root: string, chordType: string): VoicedNote[] {
  const intervals = TRIAD_INTERVALS[chordType];
  const rootIndex = noteIndex(root);
  if (!intervals || rootIndex === -1) {
    return [];
  }

  return intervals.map((interval) => {
    const absolute = rootIndex + interval;
    return {
      note: CHROMATIC_SCALE[absolute % 12],
      octave: Math.floor(absolute / 12) + 1,
    };
  });
}
