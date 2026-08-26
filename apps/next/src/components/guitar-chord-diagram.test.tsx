import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GuitarChordDiagram } from "./guitar-chord-diagram";
import type { GuitarChordShape } from "@/lib/guitar-chord-shape";

const cMajorOpen: GuitarChordShape = {
  frets: [-1, 3, 2, 0, 1, 0],
  fingers: [0, 3, 2, 0, 1, 0],
  baseFret: 1,
  barres: [],
};

const cMajorBarre: GuitarChordShape = {
  frets: [1, 1, 3, 3, 3, 1],
  fingers: [1, 1, 2, 3, 4, 1],
  baseFret: 3,
  barres: [1],
};

// Real chords-db quirk: baseFret is 1 here even though the lowest fretted
// note is at fret 2 — baseFret alone can't be trusted to mean "open
// position", so the label must always render regardless of its value.
const bMinorBarre: GuitarChordShape = {
  frets: [2, 2, 4, 4, 3, 2],
  fingers: [1, 1, 3, 4, 2, 1],
  baseFret: 1,
  barres: [2],
};

describe("GuitarChordDiagram", () => {
  it("shows a placeholder when no shape is given", () => {
    render(<GuitarChordDiagram shape={null} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("marks a muted string with an x and an open string with an o", () => {
    render(<GuitarChordDiagram shape={cMajorOpen} />);

    expect(screen.getByTestId("guitar-string-marker-0")).toHaveTextContent("×");
    expect(screen.getByTestId("guitar-string-marker-3")).toHaveTextContent("○");
    expect(screen.getByTestId("guitar-string-marker-5")).toHaveTextContent("○");
  });

  it("renders a dot for each fretted string not covered by a barre", () => {
    render(<GuitarChordDiagram shape={cMajorOpen} />);

    expect(screen.getByTestId("guitar-dot-string-1")).toBeInTheDocument();
    expect(screen.getByTestId("guitar-dot-string-2")).toBeInTheDocument();
    expect(screen.getByTestId("guitar-dot-string-4")).toBeInTheDocument();
  });

  it("shows the base fret label, visibly colored, when the shape doesn't start at the nut", () => {
    render(<GuitarChordDiagram shape={cMajorBarre} />);

    expect(screen.getByTestId("guitar-base-fret-label")).toHaveTextContent("3fr");
    expect(screen.getByTestId("guitar-base-fret-label")).toHaveAttribute(
      "fill",
      "currentColor",
    );
  });

  it("always shows the fret label, even when baseFret is 1 but the shape isn't an open position", () => {
    render(<GuitarChordDiagram shape={bMinorBarre} />);

    expect(screen.getByTestId("guitar-base-fret-label")).toHaveTextContent("1fr");
  });

  it("colors the open/muted string markers so they're visible on any background", () => {
    render(<GuitarChordDiagram shape={cMajorOpen} />);

    expect(screen.getByTestId("guitar-string-marker-0")).toHaveAttribute(
      "fill",
      "currentColor",
    );
  });

  it("renders a barre line spanning the strings it covers, without individual dots", () => {
    render(<GuitarChordDiagram shape={cMajorBarre} />);

    expect(screen.getByTestId("guitar-barre-1")).toBeInTheDocument();
    expect(screen.queryByTestId("guitar-dot-string-0")).not.toBeInTheDocument();
    expect(screen.queryByTestId("guitar-dot-string-5")).not.toBeInTheDocument();
    expect(screen.getByTestId("guitar-dot-string-2")).toBeInTheDocument();
  });
});
