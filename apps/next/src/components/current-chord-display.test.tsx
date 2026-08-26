import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CurrentChordDisplay } from "./current-chord-display";
import type { ChordSegment } from "@/lib/find-chord-at-time";

const segments: ChordSegment[] = [
  { id: "seg-1", startTime: 0, endTime: 2, root: "C", chordType: "maj" },
  { id: "seg-2", startTime: 2, endTime: 4, root: "G", chordType: "min" },
];

describe("CurrentChordDisplay", () => {
  it("shows the chord playing at the current time", () => {
    render(<CurrentChordDisplay segments={segments} currentTime={1} />);

    expect(screen.getByText("C maj")).toBeInTheDocument();
  });

  it("updates as the current time moves into the next segment", () => {
    render(<CurrentChordDisplay segments={segments} currentTime={3} />);

    expect(screen.getByText("G min")).toBeInTheDocument();
  });

  it("shows a placeholder when no chord is playing at the current time", () => {
    render(<CurrentChordDisplay segments={segments} currentTime={10} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
