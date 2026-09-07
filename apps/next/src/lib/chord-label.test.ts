import { describe, it, expect } from "vitest";
import { formatChordLabel } from "./chord-label";

describe("formatChordLabel", () => {
  it("formats a chord with no bass note", () => {
    expect(formatChordLabel({ root: "C", chordType: "major" })).toBe("C major");
  });

  it("formats a slash chord as [chord][type]/[bass] — the bass note is the whole right side", () => {
    expect(formatChordLabel({ root: "C", chordType: "major", bassNote: "F" })).toBe("C major/F");
    expect(formatChordLabel({ root: "A", chordType: "minor", bassNote: "G" })).toBe("A minor/G");
    expect(formatChordLabel({ root: "D", chordType: "7", bassNote: "F#" })).toBe("D 7/F#");
  });

  it("does not add a slash when the bass note equals the root", () => {
    expect(formatChordLabel({ root: "C", chordType: "major", bassNote: "C" })).toBe("C major");
  });

  it("does not add a slash when the bass note is null", () => {
    expect(formatChordLabel({ root: "C", chordType: "major", bassNote: null })).toBe("C major");
  });

  it('shows a placeholder instead of "N none" for a no-chord segment', () => {
    expect(formatChordLabel({ root: "N", chordType: "none" })).toBe("—");
  });
});
