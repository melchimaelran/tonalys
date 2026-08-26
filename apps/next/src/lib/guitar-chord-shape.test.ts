import { describe, it, expect } from "vitest";
import { getGuitarChordShape } from "./guitar-chord-shape";

describe("getGuitarChordShape", () => {
  it("returns the standard open shape for a major chord", () => {
    const shape = getGuitarChordShape("C", "major");

    expect(shape).toMatchObject({
      frets: [-1, 3, 2, 0, 1, 0],
      fingers: [0, 3, 2, 0, 1, 0],
      baseFret: 1,
      barres: [],
    });
  });

  it("returns a shape for a minor chord", () => {
    const shape = getGuitarChordShape("A", "minor");

    expect(shape).not.toBeNull();
    expect(shape?.frets).toHaveLength(6);
  });

  it("normalizes a sharp root to the db's flat spelling", () => {
    // D# has no "D#" entry in chords-db — only "Eb".
    const shape = getGuitarChordShape("D#", "major");

    expect(shape).not.toBeNull();
  });

  it.each(["C#", "F#"])(
    "finds a shape for %s (chords-db keys these as 'Csharp'/'Fsharp')",
    (root) => {
      expect(getGuitarChordShape(root, "major")).not.toBeNull();
      expect(getGuitarChordShape(root, "minor")).not.toBeNull();
    },
  );

  it("returns null for an unrecognized root", () => {
    expect(getGuitarChordShape("H", "major")).toBeNull();
  });

  it("returns null for chordType 'none'", () => {
    expect(getGuitarChordShape("N", "none")).toBeNull();
  });

  it.each(["7", "sus4", "dim", "aug"])("finds a shape for the %s suffix", (chordType) => {
    const shape = getGuitarChordShape("C", chordType);

    expect(shape).not.toBeNull();
  });

  it("returns the dedicated slash-chord shape for C/F when chords-db has one", () => {
    const plain = getGuitarChordShape("C", "major");
    const slash = getGuitarChordShape("C", "major", "F");

    expect(slash).not.toBeNull();
    expect(slash).not.toEqual(plain);
  });

  it("returns the dedicated slash-chord shape for D/C", () => {
    const slash = getGuitarChordShape("D", "major", "C");

    expect(slash).not.toBeNull();
  });

  it("falls back to the plain chord shape when chords-db has no shape for that slash chord", () => {
    // Bb has no slash suffixes at all in chords-db.
    const plain = getGuitarChordShape("Bb", "major");
    const slash = getGuitarChordShape("Bb", "major", "F");

    expect(slash).toEqual(plain);
  });

  it("returns the plain chord shape when the bass note equals the root", () => {
    const plain = getGuitarChordShape("C", "major");
    const withBass = getGuitarChordShape("C", "major", "C");

    expect(withBass).toEqual(plain);
  });
});
