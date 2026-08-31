import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AnalysisComplete } from "./analysis-complete";

function renderWithQuery(trackId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<AnalysisComplete trackId={trackId} />, { wrapper: Wrapper });
}

describe("AnalysisComplete", () => {
  beforeEach(() => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: "track-1", title: "My Song.mp3" }), { status: 200 }),
      ),
    );
  });

  it("shows the track title once loaded", async () => {
    renderWithQuery("track-1");

    await waitFor(() => expect(screen.getByText("My Song.mp3")).toBeInTheDocument());
  });

  it("renders a Play button wired to the track's audio", () => {
    const { container } = renderWithQuery("track-1");

    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
    expect(container.querySelector("audio")).toHaveAttribute(
      "src",
      "/api/tracks/track-1/audio",
    );
  });

  it("links to the full track view", () => {
    renderWithQuery("track-1");

    const link = screen.getByRole("link", { name: /open/i });
    expect(link).toHaveAttribute("href", "/tracks/track-1");
  });
});
