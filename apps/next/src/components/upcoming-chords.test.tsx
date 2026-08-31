import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
          { id: "seg-2", label: "G major" },
          { id: "seg-3", label: "A minor" },
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("G major");
    expect(items[1]).toHaveTextContent("A minor");
  });
});
