import { CHROMATIC_SCALE, noteIndex } from "@/lib/notes";

// Every interval here stays under 12 (i.e. within one octave of the root)
// so the resulting note always lands in octave 1 or 2 — the two octaves
// PianoKeyboard actually renders. 9th-and-above extensions (9, maj9, m9,
// add9) aren't listed: their characteristic tone is more than an octave
// above the root, which would need a 3rd rendered octave to place
// correctly. They're still fully supported for editing/guitar/display —
// this table only governs which notes light up on the piano.
const CHORD_INTERVALS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  6: [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  7: [0, 4, 7, 10],
  m7: [0, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  mmaj7: [0, 3, 7, 11],
};

export interface VoicedNote {
  note: string;
  octave: number;
}

// Notes climb from the root in ascending pitch order (matching the
// interval tables' own ascending order) rather than all collapsing onto
// the same pitch class — each chord tone lights up exactly once, in
// whichever of the two rendered octaves it actually falls in.
export function getChordNotes(root: string, chordType: string): VoicedNote[] {
  const intervals = CHORD_INTERVALS[chordType];
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
