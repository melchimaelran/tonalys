import type { ChordSegment } from "./find-chord-at-time";

export function computeChordProgress(chord: ChordSegment, time: number): number {
  const duration = chord.endTime - chord.startTime;
  if (duration <= 0) return 0;

  return Math.min(1, Math.max(0, (time - chord.startTime) / duration));
}
