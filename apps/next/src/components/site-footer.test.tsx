import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteFooter } from "./site-footer";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("SiteFooter", () => {
  beforeEach(() => {
    mockPathname = "/";
  });

  it("links to GitHub and LinkedIn with safe rel attributes", () => {
    render(<SiteFooter />);

    const github = screen.getByRole("link", { name: /github/i });
    expect(github).toHaveAttribute("href", "https://github.com/melchimaelran/tonalys");
    expect(github).toHaveAttribute("rel", "noopener noreferrer");

    const linkedin = screen.getByRole("link", { name: /linkedin/i });
    expect(linkedin).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/melchimael-roeh-429ab6210/",
    );
    expect(linkedin).toHaveAttribute("rel", "noopener noreferrer");

    const whatsapp = screen.getByRole("link", { name: /whatsapp/i });
    expect(whatsapp).toHaveAttribute("href", "https://wa.me/261387817393");
    expect(whatsapp).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("links to the About page", () => {
    render(<SiteFooter />);

    expect(screen.getByRole("link", { name: /about/i })).toHaveAttribute("href", "/about");
  });

  it("renders nothing on the login page", () => {
    mockPathname = "/login";
    const { container } = render(<SiteFooter />);

    expect(container).toBeEmptyDOMElement();
  });
});
