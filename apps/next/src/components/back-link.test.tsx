import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BackLink } from "./back-link";

describe("BackLink", () => {
  it("renders a link to href with the given label", () => {
    render(<BackLink href="/" label="Home" />);

    const link = screen.getByRole("link", { name: /home/i });
    expect(link).toHaveAttribute("href", "/");
  });
});
