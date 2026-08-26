export interface ChordSegment {
  id: string;
  startTime: number;
  endTime: number;
  root: string;
  chordType: string;
  bassNote?: string | null;
}

export function findChordAtTime(
  segments: ChordSegment[],
  time: number,
): ChordSegment | null {
  return segments.find((segment) => time >= segment.startTime && time < segment.endTime) ?? null;
}
