import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { DemoSongs } from "./demo-songs";

function renderDemoSongs() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<DemoSongs />, { wrapper: Wrapper });
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

describe("DemoSongs", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders each demo song as a link to its track view", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(tracks), { status: 200 }),
    );

    renderDemoSongs();

    const newer = await screen.findByRole("link", { name: /Newer Song\.mp3/ });
    expect(newer).toHaveAttribute("href", "/tracks/track-2");
    const older = screen.getByRole("link", { name: /Older Song/ });
    expect(older).toHaveAttribute("href", "/tracks/track-1");
  });

  it("shows the upload date for each track", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(tracks), { status: 200 }),
    );

    renderDemoSongs();

    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    expect(
      await screen.findByText(new RegExp(fmt("2026-02-01T00:00:00.000Z"))),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(fmt("2026-01-01T00:00:00.000Z"))),
    ).toBeInTheDocument();
  });

  it("shows the analysis status for each track", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(tracks), { status: 200 }),
    );

    renderDemoSongs();

    expect(await screen.findByText("READY")).toBeInTheDocument();
    expect(screen.getByText("PROCESSING")).toBeInTheDocument();
  });

  it("shows an empty state when there are no demo songs", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    renderDemoSongs();

    expect(await screen.findByText(/no demo songs yet/i)).toBeInTheDocument();
  });

  it("shows an error message when the list fails to load", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("nope", { status: 502 }));

    renderDemoSongs();

    expect(
      await screen.findByText(/couldn't load the demo songs/i),
    ).toBeInTheDocument();
  });

  it("paginates at 10 per page and moves between pages", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 12 }, (_, i) => ({
      id: `track-${i}`,
      title: `Song ${i}`,
      status: "READY" as const,
      sourceType: "UPLOAD" as const,
      durationSeconds: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    }));
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(many), { status: 200 }),
    );

    renderDemoSongs();

    const list = await screen.findByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.queryByText("Song 11")).toBeNull();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    expect(screen.getByText("Song 11")).toBeInTheDocument();
  });

  it("shows no pager when there is a single page", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(tracks), { status: 200 }),
    );

    renderDemoSongs();

    await screen.findByRole("link", { name: /Newer Song\.mp3/ });
    expect(
      screen.queryByRole("navigation", { name: /demo songs pages/i }),
    ).toBeNull();
  });
});
