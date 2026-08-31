import { describe, it, expect } from "vitest";
import { formatChordLabel } from "./chord-label";

describe("formatChordLabel", () => {
  it("formats a chord with no bass note", () => {
    expect(formatChordLabel({ root: "C", chordType: "major" })).toBe("C major");
  });

  it("formats a slash chord when the bass note differs from the root", () => {
    expect(formatChordLabel({ root: "C", chordType: "major", bassNote: "F" })).toBe("C/F major");
  });

  it("does not add a slash when the bass note equals the root", () => {
    expect(formatChordLabel({ root: "C", chordType: "major", bassNote: "C" })).toBe("C major");
  });

  it("does not add a slash when the bass note is null", () => {
    expect(formatChordLabel({ root: "C", chordType: "major", bassNote: null })).toBe("C major");
  });
});
