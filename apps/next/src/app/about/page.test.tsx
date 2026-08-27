import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AboutPage from "./page";

describe("AboutPage", () => {
  it("renders the project write-up headings", () => {
    render(<AboutPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /about tonalys/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /how it works/i })).toBeInTheDocument();
  });

  it("links to the GitHub repository and LinkedIn profile", () => {
    render(<AboutPage />);

    const github = screen.getByRole("link", { name: /github/i });
    expect(github).toHaveAttribute("href", "https://github.com/melchimaelran/tonalys");
    expect(github).toHaveAttribute("rel", "noopener noreferrer");

    const linkedin = screen.getByRole("link", { name: /linkedin/i });
    expect(linkedin).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/melchimael-roeh-429ab6210/",
    );
    expect(linkedin).toHaveAttribute("rel", "noopener noreferrer");
  });
});
