import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayScreenPreview } from "./play-screen-preview";

describe("PlayScreenPreview", () => {
  it("shows the chord, both piano and guitar views, and what comes next", () => {
    const { container } = render(<PlayScreenPreview />);

    expect(screen.getByText("Cmaj7")).toBeInTheDocument();
    expect(screen.getByText(/Am7/)).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid^="piano-key-"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Guitar chord diagram"]'),
    ).not.toBeNull();
  });

  it("is a decorative, non-interactive figure", () => {
    const { container } = render(<PlayScreenPreview />);

    const figure = container.querySelector("figure");
    expect(figure).toHaveAttribute("aria-hidden");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("slider")).toBeNull();
  });
});
