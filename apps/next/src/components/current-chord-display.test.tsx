import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CurrentChordDisplay } from "./current-chord-display";
import type { ChordSegment } from "@/lib/find-chord-at-time";

const chord: ChordSegment = {
  id: "seg-1",
  startTime: 0,
  endTime: 2,
  root: "C",
  chordType: "major",
};

describe("CurrentChordDisplay", () => {
  it("shows the given chord", () => {
    render(<CurrentChordDisplay chord={chord} />);

    expect(screen.getByText("C major")).toBeInTheDocument();
  });

  it("shows a placeholder when no chord is given", () => {
    render(<CurrentChordDisplay chord={null} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows slash notation for a chord with a bass note", () => {
    render(<CurrentChordDisplay chord={{ ...chord, bassNote: "F" }} />);

    expect(screen.getByText("C/F major")).toBeInTheDocument();
  });

  it("doesn't show slash notation when the bass note equals the root", () => {
    render(<CurrentChordDisplay chord={{ ...chord, bassNote: "C" }} />);

    expect(screen.getByText("C major")).toBeInTheDocument();
  });
});
