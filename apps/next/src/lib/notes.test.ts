import { describe, it, expect } from "vitest";
import { transposeRoot } from "./notes";

describe("transposeRoot", () => {
  it("returns the same note when transposing by 0 semitones", () => {
    expect(transposeRoot("D", 0)).toBe("D");
  });

  it("transposes up within the octave", () => {
    expect(transposeRoot("C", 2)).toBe("D");
  });

  it("wraps around the top of the scale when transposing up", () => {
    expect(transposeRoot("A", 4)).toBe("C#");
  });

  it("transposes down (negative semitones)", () => {
    expect(transposeRoot("D", -2)).toBe("C");
  });

  it("wraps around the bottom of the scale when transposing down", () => {
    expect(transposeRoot("C", -2)).toBe("A#");
  });

  it("normalizes a flat root before transposing", () => {
    expect(transposeRoot("Eb", -2)).toBe("C#");
  });

  it("returns an empty string for an unrecognized root", () => {
    expect(transposeRoot("H", 2)).toBe("");
  });

  it("handles a negative shift larger than the fixed wraparound offset", () => {
    expect(transposeRoot("C", -200)).toBe("E");
  });
});
