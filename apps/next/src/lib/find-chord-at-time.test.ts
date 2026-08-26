import { describe, it, expect } from "vitest";
import { findChordAtTime, type ChordSegment } from "./find-chord-at-time";

const segments: ChordSegment[] = [
  { id: "seg-1", startTime: 0, endTime: 2, root: "C", chordType: "maj" },
  { id: "seg-2", startTime: 2, endTime: 4, root: "G", chordType: "maj" },
];

describe("findChordAtTime", () => {
  it("returns null when there are no segments", () => {
    expect(findChordAtTime([], 1)).toBeNull();
  });

  it("returns the segment containing the given time", () => {
    expect(findChordAtTime(segments, 1)).toEqual(segments[0]);
  });

  it("includes a segment's start time as part of that segment", () => {
    expect(findChordAtTime(segments, 2)).toEqual(segments[1]);
  });

  it("excludes a segment's end time (belongs to the next segment)", () => {
    expect(findChordAtTime(segments, 2)).not.toEqual(segments[0]);
  });

  it("returns null when the time falls in a gap between segments", () => {
    const withGap: ChordSegment[] = [
      { id: "seg-1", startTime: 0, endTime: 1, root: "C", chordType: "maj" },
      { id: "seg-2", startTime: 3, endTime: 4, root: "G", chordType: "maj" },
    ];

    expect(findChordAtTime(withGap, 2)).toBeNull();
  });

  it("returns null when the time is after the last segment", () => {
    expect(findChordAtTime(segments, 10)).toBeNull();
  });
});
