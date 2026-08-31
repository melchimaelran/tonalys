import { describe, it, expect } from "vitest";
import { findChordAtTime, findUpcomingChords, type ChordSegment } from "./find-chord-at-time";

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

describe("findUpcomingChords", () => {
  it("returns an empty array when there are no segments", () => {
    expect(findUpcomingChords([], 0, 4)).toEqual([]);
  });

  it("returns fewer than count when fewer remain after the given time", () => {
    expect(findUpcomingChords(segments, 0, 4)).toEqual([segments[1]]);
  });

  it("returns exactly count when exactly that many remain", () => {
    const three: ChordSegment[] = [
      { id: "seg-1", startTime: 0, endTime: 1, root: "C", chordType: "maj" },
      { id: "seg-2", startTime: 1, endTime: 2, root: "D", chordType: "maj" },
      { id: "seg-3", startTime: 2, endTime: 3, root: "E", chordType: "maj" },
    ];

    expect(findUpcomingChords(three, 0, 2)).toEqual([three[1], three[2]]);
  });

  it("caps at count and stays chronological when more remain", () => {
    const five: ChordSegment[] = [
      { id: "seg-1", startTime: 0, endTime: 1, root: "C", chordType: "maj" },
      { id: "seg-2", startTime: 1, endTime: 2, root: "D", chordType: "maj" },
      { id: "seg-3", startTime: 2, endTime: 3, root: "E", chordType: "maj" },
      { id: "seg-4", startTime: 3, endTime: 4, root: "F", chordType: "maj" },
      { id: "seg-5", startTime: 4, endTime: 5, root: "G", chordType: "maj" },
    ];

    expect(findUpcomingChords(five, 0, 2)).toEqual([five[1], five[2]]);
  });

  it("returns everything after the given time when it falls in a gap", () => {
    const withGap: ChordSegment[] = [
      { id: "seg-1", startTime: 0, endTime: 1, root: "C", chordType: "maj" },
      { id: "seg-2", startTime: 3, endTime: 4, root: "G", chordType: "maj" },
    ];

    expect(findUpcomingChords(withGap, 2, 4)).toEqual([withGap[1]]);
  });

  it("returns an empty array when the time is after the last segment", () => {
    expect(findUpcomingChords(segments, 10, 4)).toEqual([]);
  });

  it("returns chronological order even when the input is unsorted", () => {
    const unsorted: ChordSegment[] = [
      { id: "seg-3", startTime: 2, endTime: 3, root: "E", chordType: "maj" },
      { id: "seg-1", startTime: 0, endTime: 1, root: "C", chordType: "maj" },
      { id: "seg-2", startTime: 1, endTime: 2, root: "D", chordType: "maj" },
    ];

    expect(findUpcomingChords(unsorted, 0, 4)).toEqual([unsorted[2], unsorted[0]]);
  });
});
