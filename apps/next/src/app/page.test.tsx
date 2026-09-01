import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import Home from "./page";

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<Home />, { wrapper: Wrapper });
}

describe("Home", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("leads with a headline and an upload call to action", () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: /chords to any song/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /upload a track/i }),
    ).toHaveAttribute("href", "/upload");
    expect(
      screen.getByRole("link", { name: /how it works/i }),
    ).toHaveAttribute("href", "/about");
    expect(
      screen.getByRole("link", { name: /view demo songs/i }),
    ).toHaveAttribute("href", "#demo-songs");
  });

  it("presents the feature set with a player preview", () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    const { container } = renderPage();

    expect(screen.getByText("What it detects")).toBeInTheDocument();
    expect(screen.getByText("Beyond major & minor")).toBeInTheDocument();
    // The static player preview (decorative figure) with both views.
    const preview = container.querySelector("figure[aria-hidden]");
    expect(preview).not.toBeNull();
    expect(preview?.textContent).toContain("Am7");
    expect(
      preview?.querySelector('[aria-label="Guitar chord diagram"]'),
    ).not.toBeNull();
  });

  it("lists the demo songs, each linking to its track view", async () => {
    const tracks = [
      {
        id: "track-1",
        title: "My Song.mp3",
        status: "READY",
        sourceType: "UPLOAD",
        durationSeconds: 120,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(tracks), { status: 200 }),
    );

    renderPage();

    expect(
      screen.getByRole("heading", { name: /demo songs/i }),
    ).toBeInTheDocument();
    const link = await screen.findByRole("link", { name: /My Song\.mp3/ });
    expect(link).toHaveAttribute("href", "/tracks/track-1");
  });
});
