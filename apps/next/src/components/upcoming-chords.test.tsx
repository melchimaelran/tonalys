import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UpcomingChords } from "./upcoming-chords";

describe("UpcomingChords", () => {
  it("renders nothing when there are no upcoming chords", () => {
    const { container } = render(<UpcomingChords chords={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders one item per chord, in order", () => {
    render(
      <UpcomingChords
        chords={[
          { id: "seg-2", label: "G major", durationSeconds: 4 },
          { id: "seg-3", label: "A minor", durationSeconds: 2 },
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("G major");
    expect(items[1]).toHaveTextContent("A minor");
  });

  it("shows each chord's duration in whole seconds", () => {
    render(
      <UpcomingChords
        chords={[
          { id: "seg-2", label: "G major", durationSeconds: 4 },
          { id: "seg-3", label: "A minor", durationSeconds: 2 },
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("4s");
    expect(items[1]).toHaveTextContent("2s");
  });

  it("sizes each row's width in proportion to the chord's duration, keeping a minimum width", () => {
    render(
      <UpcomingChords
        chords={[
          { id: "seg-2", label: "G major", durationSeconds: 2 },
          { id: "seg-3", label: "A minor", durationSeconds: 8 },
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveStyle({ width: "25%" });
    expect(items[1]).toHaveStyle({ width: "100%" });
    expect(items[0].className).toContain("min-w-[6rem]");
  });

  it("keeps the chord name on a single line", () => {
    render(
      <UpcomingChords
        chords={[{ id: "seg-2", label: "F#m7b5", durationSeconds: 4 }]}
      />,
    );

    expect(screen.getByText("F#m7b5").className).toContain("whitespace-nowrap");
  });

  it("explains the width-to-duration mapping in a popover opened by click", async () => {
    const user = userEvent.setup();
    render(
      <UpcomingChords
        chords={[{ id: "seg-2", label: "G major", durationSeconds: 4 }]}
      />,
    );

    expect(screen.queryByText(/width shows how long the chord/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /about the chord bars/i }));

    await waitFor(() =>
      expect(screen.getByText(/width shows how long the chord/i)).toBeInTheDocument(),
    );
  });
});
