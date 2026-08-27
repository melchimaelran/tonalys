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

  it("renders the track library, listing analyzed tracks", async () => {
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

    const link = await screen.findByRole("link", { name: /My Song\.mp3/ });
    expect(link).toHaveAttribute("href", "/tracks/track-1");
  });

  it("links to the upload page", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    renderPage();

    expect(
      await screen.findByRole("link", { name: /add a track/i }),
    ).toHaveAttribute("href", "/upload");
  });

  it("shows a hero with a tagline and an upload call to action", () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "Tonalys" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/detect chords, tempo and key/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /upload a track/i }),
    ).toHaveAttribute("href", "/upload");
  });
});
