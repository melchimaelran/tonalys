import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TonalysLogo } from "./tonalys-logo";

describe("TonalysLogo", () => {
  it("renders the mark as an svg", () => {
    const { container } = render(<TonalysLogo />);

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("exposes an accessible name when shown as a standalone mark", () => {
    render(<TonalysLogo />);

    expect(screen.getByRole("img", { name: /tonalys/i })).toBeInTheDocument();
  });

  it("renders the wordmark text when showWordmark is set", () => {
    render(<TonalysLogo showWordmark />);

    expect(screen.getByText("Tonalys")).toBeInTheDocument();
  });

  it("hides the mark from assistive tech when the wordmark provides the name", () => {
    const { container } = render(<TonalysLogo showWordmark />);

    expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("passes through a className", () => {
    const { container } = render(<TonalysLogo className="text-primary" />);

    expect(container.firstChild).toHaveClass("text-primary");
  });
});
