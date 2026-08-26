import { describe, it, expect } from "vitest";
import { getChordNotes } from "./chord-notes";

describe("getChordNotes", () => {
  it("returns the major triad for a major chord, all in octave 1", () => {
    expect(getChordNotes("C", "major")).toEqual([
      { note: "C", octave: 1 },
      { note: "E", octave: 1 },
      { note: "G", octave: 1 },
    ]);
  });

  it("returns the minor triad for a minor chord", () => {
    expect(getChordNotes("A", "minor")).toEqual([
      { note: "A", octave: 1 },
      { note: "C", octave: 2 },
      { note: "E", octave: 2 },
    ]);
  });

  it("bumps the octave for notes that wrap past B", () => {
    expect(getChordNotes("A", "major")).toEqual([
      { note: "A", octave: 1 },
      { note: "C#", octave: 2 },
      { note: "E", octave: 2 },
    ]);
  });

  it("normalizes a flat root to its sharp equivalent", () => {
    expect(getChordNotes("Eb", "major")).toEqual([
      { note: "D#", octave: 1 },
      { note: "G", octave: 1 },
      { note: "A#", octave: 1 },
    ]);
  });

  it("returns no notes for chordType 'none'", () => {
    expect(getChordNotes("N", "none")).toEqual([]);
  });

  it("returns no notes for an unrecognized root", () => {
    expect(getChordNotes("H", "major")).toEqual([]);
  });
});
