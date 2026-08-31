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

  it("shows a duration label when durationSeconds is given", () => {
    render(<CurrentChordDisplay chord={chord} durationSeconds={3} />);

    expect(screen.getByText("3s")).toBeInTheDocument();
  });

  it("shows no duration label when durationSeconds is omitted", () => {
    render(<CurrentChordDisplay chord={chord} />);

    expect(screen.queryByText(/s$/)).not.toBeInTheDocument();
  });

  it("shows no duration label when there is no chord", () => {
    render(<CurrentChordDisplay chord={null} durationSeconds={3} />);

    expect(screen.queryByText("3s")).not.toBeInTheDocument();
  });

  it("sizes the progress fill to the given progress", () => {
    render(<CurrentChordDisplay chord={chord} progress={0.4} />);

    expect(screen.getByTestId("chord-progress-fill")).toHaveStyle({ width: "40%" });
  });

  it("clamps progress below 0 to 0%", () => {
    render(<CurrentChordDisplay chord={chord} progress={-0.2} />);

    expect(screen.getByTestId("chord-progress-fill")).toHaveStyle({ width: "0%" });
  });

  it("clamps progress above 1 to 100%", () => {
    render(<CurrentChordDisplay chord={chord} progress={1.5} />);

    expect(screen.getByTestId("chord-progress-fill")).toHaveStyle({ width: "100%" });
  });
});
