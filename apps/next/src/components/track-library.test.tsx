import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { TrackLibrary } from "./track-library";

function renderLibrary() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<TrackLibrary />, { wrapper: Wrapper });
}

const tracks = [
  {
    id: "track-2",
    title: "Newer Song.mp3",
    status: "READY",
    sourceType: "UPLOAD",
    durationSeconds: 185,
    createdAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "track-1",
    title: "Older Song",
    status: "PROCESSING",
    sourceType: "YOUTUBE",
    durationSeconds: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("TrackLibrary", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders each analyzed track as a link to its track view", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(tracks), { status: 200 }),
    );

    renderLibrary();

    const newer = await screen.findByRole("link", { name: /Newer Song\.mp3/ });
    expect(newer).toHaveAttribute("href", "/tracks/track-2");
    const older = screen.getByRole("link", { name: /Older Song/ });
    expect(older).toHaveAttribute("href", "/tracks/track-1");
  });

  it("shows the analysis status for each track", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(tracks), { status: 200 }),
    );

    renderLibrary();

    expect(await screen.findByText("READY")).toBeInTheDocument();
    expect(screen.getByText("PROCESSING")).toBeInTheDocument();
  });

  it("shows an empty state with a link to add a track when there are none", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    renderLibrary();

    expect(await screen.findByText(/no tracks yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add a track/i })).toHaveAttribute(
      "href",
      "/upload",
    );
  });

  it("shows an error message when the list fails to load", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("nope", { status: 502 }));

    renderLibrary();

    expect(
      await screen.findByText(/couldn't load your library/i),
    ).toBeInTheDocument();
  });
});
