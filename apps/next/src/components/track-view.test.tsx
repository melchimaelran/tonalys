import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { TrackView } from "./track-view";

function renderTrackView(trackId: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<TrackView trackId={trackId} />, { wrapper: Wrapper });
}

describe("TrackView", () => {
  beforeEach(() => {
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("points the AudioPlayer at the track's audio endpoint", async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 })),
    );

    const { container } = renderTrackView("track-1");

    expect(container.querySelector("audio")).toHaveAttribute(
      "src",
      "/api/tracks/track-1/audio",
    );
    await screen.findByText("—");
  });

  it("highlights the chord matching the audio's current playback time", async () => {
    const chords = [{ id: "seg-1", startTime: 0, endTime: 5, root: "C", chordType: "maj" }];
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(chords), { status: 200 })),
    );

    const { container } = renderTrackView("track-1");
    await screen.findByText("C maj");

    const audio = container.querySelector("audio") as HTMLAudioElement;
    Object.defineProperty(audio, "currentTime", { value: 10, configurable: true });
    fireEvent.timeUpdate(audio);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("highlights the piano keys for the chord playing at the current time", async () => {
    const chords = [{ id: "seg-1", startTime: 0, endTime: 5, root: "C", chordType: "major" }];
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(chords), { status: 200 })),
    );

    renderTrackView("track-1");

    await screen.findByText("C major");
    expect(screen.getByTestId("piano-key-C-1")).toHaveClass("bg-primary");
    expect(screen.getByTestId("piano-key-E-1")).toHaveClass("bg-primary");
    expect(screen.getByTestId("piano-key-G-1")).toHaveClass("bg-primary");
    expect(screen.getByTestId("piano-key-D-1")).not.toHaveClass("bg-primary");
  });

  it("shows the piano by default and not the guitar diagram", async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 })),
    );

    renderTrackView("track-1");
    await screen.findByText("—");

    expect(screen.getByRole("img", { name: "Piano keyboard" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Guitar chord diagram" })).not.toBeInTheDocument();
  });

  it("switches to the guitar diagram and hides the piano when that tab is selected", async () => {
    const chords = [{ id: "seg-1", startTime: 0, endTime: 5, root: "C", chordType: "major" }];
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(chords), { status: 200 })),
    );

    renderTrackView("track-1");
    await screen.findByText("C major");

    fireEvent.click(screen.getByRole("tab", { name: /guitar/i }));

    expect(screen.getByRole("img", { name: "Guitar chord diagram" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Piano keyboard" })).not.toBeInTheDocument();
  });

  it("shows the track title", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url === "/api/tracks/track-1") {
        return Promise.resolve(
          new Response(JSON.stringify({ id: "track-1", title: "My Song.mp3" }), { status: 200 }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });

    renderTrackView("track-1");

    expect(await screen.findByRole("heading", { name: "My Song.mp3" })).toBeInTheDocument();
  });
});
