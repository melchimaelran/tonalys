import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { SiteNavbar } from "./site-navbar";

let mockPathname = "/";
const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push }),
}));

function renderNavbar() {
  const queryClient = new QueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<SiteNavbar />, { wrapper: Wrapper });
}

describe("SiteNavbar", () => {
  beforeEach(() => {
    mockPathname = "/";
    push.mockClear();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  });

  it("renders the primary nav links", () => {
    renderNavbar();

    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute("href", "/");
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
    expect(screen.getByRole("link", { name: "Library" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renders nothing on the login page", () => {
    mockPathname = "/login";
    const { container } = renderNavbar();

    expect(container).toBeEmptyDOMElement();
  });

  it("signs out: clears the session and navigates to /login", async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    expect(fetch).toHaveBeenCalledWith("/api/logout", { method: "POST" });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
  });
});
