import { describe, it, expect } from "vitest";
import { computeChordProgress } from "./chord-progress";
import type { ChordSegment } from "./find-chord-at-time";

const chord: ChordSegment = { id: "seg-1", startTime: 2, endTime: 6, root: "C", chordType: "maj" };

describe("computeChordProgress", () => {
  it("returns 0 at the start of the chord", () => {
    expect(computeChordProgress(chord, 2)).toBe(0);
  });

  it("returns 0.5 at the midpoint", () => {
    expect(computeChordProgress(chord, 4)).toBe(0.5);
  });

  it("returns 1 at the end of the chord", () => {
    expect(computeChordProgress(chord, 6)).toBe(1);
  });

  it("clamps to 0 before the start", () => {
    expect(computeChordProgress(chord, 0)).toBe(0);
  });

  it("clamps to 1 after the end", () => {
    expect(computeChordProgress(chord, 100)).toBe(1);
  });

  it("returns 0 for a zero-duration chord without dividing by zero", () => {
    const zeroDuration: ChordSegment = { id: "seg-2", startTime: 3, endTime: 3, root: "G", chordType: "maj" };

    expect(computeChordProgress(zeroDuration, 3)).toBe(0);
  });
});
