import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SiteNavbar } from "./site-navbar";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

function renderNavbar() {
  return render(<SiteNavbar />);
}

describe("SiteNavbar", () => {
  beforeEach(() => {
    mockPathname = "/";
  });

  it("renders the primary nav links", () => {
    renderNavbar();

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Add a track" })).toHaveAttribute(
      "href",
      "/upload",
    );
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
  });

  it("links to GitHub and LinkedIn with safe rel attributes", () => {
    renderNavbar();

    const github = screen.getByRole("link", { name: /github/i });
    expect(github).toHaveAttribute("href", "https://github.com/melchimaelran/tonalys");
    expect(github).toHaveAttribute("rel", "noopener noreferrer");
    expect(github).toHaveAttribute("target", "_blank");

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

  it("marks the current route's link as the active page", () => {
    mockPathname = "/upload";
    renderNavbar();

    expect(screen.getByRole("link", { name: "Add a track" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renders nothing on the login page", () => {
    mockPathname = "/login";
    const { container } = renderNavbar();

    expect(container).toBeEmptyDOMElement();
  });

  it("has no sign-out control", () => {
    renderNavbar();

    expect(screen.queryByRole("button", { name: /sign out/i })).toBeNull();
  });
});
