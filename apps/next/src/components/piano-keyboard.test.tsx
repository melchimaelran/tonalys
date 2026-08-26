import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PianoKeyboard } from "./piano-keyboard";

describe("PianoKeyboard", () => {
  it("renders all twelve keys across both octaves", () => {
    render(<PianoKeyboard highlightedNotes={[]} />);

    ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].forEach((note) => {
      expect(screen.getAllByTestId(`piano-key-${note}-1`)).toHaveLength(1);
      expect(screen.getAllByTestId(`piano-key-${note}-2`)).toHaveLength(1);
    });
  });

  it("highlights exactly the given note in its given octave", () => {
    render(
      <PianoKeyboard
        highlightedNotes={[
          { note: "C", octave: 1 },
          { note: "E", octave: 1 },
          { note: "G", octave: 1 },
        ]}
      />,
    );

    expect(screen.getByTestId("piano-key-C-1")).toHaveClass("bg-primary");
    expect(screen.getByTestId("piano-key-E-1")).toHaveClass("bg-primary");
    expect(screen.getByTestId("piano-key-G-1")).toHaveClass("bg-primary");
  });

  it("does not highlight the same note in an octave it wasn't given for", () => {
    render(<PianoKeyboard highlightedNotes={[{ note: "C", octave: 1 }]} />);

    expect(screen.getByTestId("piano-key-C-2")).not.toHaveClass("bg-primary");
  });

  it("does not highlight notes outside the chord", () => {
    render(<PianoKeyboard highlightedNotes={[{ note: "C", octave: 1 }]} />);

    expect(screen.getByTestId("piano-key-D-1")).not.toHaveClass("bg-primary");
  });

  it("highlights a note that wraps into the second octave", () => {
    render(<PianoKeyboard highlightedNotes={[{ note: "C#", octave: 2 }]} />);

    expect(screen.getByTestId("piano-key-C#-2")).toHaveClass("bg-primary");
    expect(screen.getByTestId("piano-key-C#-1")).not.toHaveClass("bg-primary");
  });

  it("highlights nothing when no notes are given", () => {
    render(<PianoKeyboard highlightedNotes={[]} />);

    ["C", "C#", "D", "E", "F", "G", "A", "B"].forEach((note) => {
      expect(screen.getByTestId(`piano-key-${note}-1`)).not.toHaveClass("bg-primary");
    });
  });
});
