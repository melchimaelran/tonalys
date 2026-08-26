import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  it("recomputes the displayed chord name and piano highlight when transpose changes, without touching audio", async () => {
    const chords = [{ id: "seg-1", startTime: 0, endTime: 5, root: "C", chordType: "major" }];
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(chords), { status: 200 })),
    );

    const { container } = renderTrackView("track-1");
    await screen.findByText("C major");
    expect(screen.getByTestId("piano-key-C-1")).toHaveClass("bg-primary");

    fireEvent.change(screen.getByRole("combobox", { name: /transpose/i }), {
      target: { value: "2" },
    });

    expect(screen.getByText("D major")).toBeInTheDocument();
    expect(screen.queryByText("C major")).not.toBeInTheDocument();
    expect(screen.getByTestId("piano-key-D-1")).toHaveClass("bg-primary");
    expect(screen.getByTestId("piano-key-C-1")).not.toHaveClass("bg-primary");
    // Transpose is purely visual — it must never touch the audio element itself.
    expect(container.querySelector("audio")).toHaveAttribute(
      "src",
      "/api/tracks/track-1/audio",
    );
  });

  it("does not show the transpose selector on the guitar view", async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 })),
    );

    renderTrackView("track-1");
    await screen.findByText("—");
    fireEvent.click(screen.getByRole("tab", { name: /guitar/i }));

    expect(screen.queryByRole("combobox", { name: /transpose/i })).not.toBeInTheDocument();
  });

  it("shows the real chord name again (not transposed) when switching back to guitar", async () => {
    const chords = [{ id: "seg-1", startTime: 0, endTime: 5, root: "C", chordType: "major" }];
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(chords), { status: 200 })),
    );

    renderTrackView("track-1");
    await screen.findByText("C major");
    fireEvent.change(screen.getByRole("combobox", { name: /transpose/i }), {
      target: { value: "2" },
    });
    expect(screen.getByText("D major")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /guitar/i }));

    expect(screen.getByText("C major")).toBeInTheDocument();
    expect(screen.queryByText("D major")).not.toBeInTheDocument();
  });

  it("recomputes the displayed chord name and shape when the capo changes, without touching audio", async () => {
    const chords = [{ id: "seg-1", startTime: 0, endTime: 5, root: "D", chordType: "major" }];
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(chords), { status: 200 })),
    );

    const { container } = renderTrackView("track-1");
    await screen.findByText("D major");
    fireEvent.click(screen.getByRole("tab", { name: /guitar/i }));

    expect(screen.getByText("D major")).toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: /capo/i }), {
      target: { value: "2" },
    });

    expect(screen.getByText("C major")).toBeInTheDocument();
    expect(screen.queryByText("D major")).not.toBeInTheDocument();
    // Capo is purely visual — it must never touch the audio element itself.
    expect(container.querySelector("audio")).toHaveAttribute(
      "src",
      "/api/tracks/track-1/audio",
    );
  });

  it("shows the real chord name again (not capo-transposed) when switching back to piano", async () => {
    const chords = [{ id: "seg-1", startTime: 0, endTime: 5, root: "D", chordType: "major" }];
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(chords), { status: 200 })),
    );

    renderTrackView("track-1");
    await screen.findByText("D major");
    fireEvent.click(screen.getByRole("tab", { name: /guitar/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /capo/i }), {
      target: { value: "2" },
    });
    expect(screen.getByText("C major")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /piano/i }));

    expect(screen.getByText("D major")).toBeInTheDocument();
    expect(screen.queryByText("C major")).not.toBeInTheDocument();
  });

  it("does not show the capo selector on the piano view", async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify([]), { status: 200 })),
    );

    renderTrackView("track-1");
    await screen.findByText("—");

    expect(screen.queryByRole("combobox", { name: /capo/i })).not.toBeInTheDocument();
  });

  it("lets the user edit the current chord segment and refetches after saving", async () => {
    const chords = [{ id: "seg-1", startTime: 0, endTime: 5, root: "C", chordType: "major" }];
    const updated = { id: "seg-1", startTime: 0, endTime: 5, root: "G", chordType: "minor" };
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (init?.method === "PATCH") {
        return Promise.resolve(new Response(JSON.stringify(updated), { status: 200 }));
      }
      if (url === "/api/tracks/track-1/chords") {
        return Promise.resolve(new Response(JSON.stringify(chords), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });

    renderTrackView("track-1");
    await screen.findByText("C major");

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /^root$/i }), {
      target: { value: "G" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /chord type/i }), {
      target: { value: "minor" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/tracks/track-1/chords/seg-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ root: "G", chordType: "minor", bassNote: null }),
        }),
      ),
    );
    // The edit form closes and the chords query is refetched.
    expect(screen.queryByRole("combobox", { name: /^root$/i })).not.toBeInTheDocument();
  });

  it("shows slash notation for a chord that has a bass note", async () => {
    const chords = [
      { id: "seg-1", startTime: 0, endTime: 5, root: "C", chordType: "major", bassNote: "F" },
    ];
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(chords), { status: 200 })),
    );

    renderTrackView("track-1");

    await screen.findByText("C/F major");
  });

  it("lets the user turn a chord into a slash chord and sends the bass note", async () => {
    const chords = [{ id: "seg-1", startTime: 0, endTime: 5, root: "C", chordType: "major" }];
    const updated = {
      id: "seg-1",
      startTime: 0,
      endTime: 5,
      root: "C",
      chordType: "major",
      bassNote: "F",
    };
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (init?.method === "PATCH") {
        return Promise.resolve(new Response(JSON.stringify(updated), { status: 200 }));
      }
      if (url === "/api/tracks/track-1/chords") {
        return Promise.resolve(new Response(JSON.stringify(chords), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    });

    renderTrackView("track-1");
    await screen.findByText("C major");

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.change(screen.getByRole("combobox", { name: /bass note/i }), {
      target: { value: "F" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/tracks/track-1/chords/seg-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ root: "C", chordType: "major", bassNote: "F" }),
        }),
      ),
    );
  });

  it("closes the edit form without saving when Cancel is clicked", async () => {
    const chords = [{ id: "seg-1", startTime: 0, endTime: 5, root: "C", chordType: "major" }];
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify(chords), { status: 200 })),
    );

    renderTrackView("track-1");
    await screen.findByText("C major");
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.queryByRole("combobox", { name: /^root$/i })).not.toBeInTheDocument();
    expect(screen.getByText("C major")).toBeInTheDocument();
  });

  it("keeps the edit form open and shows an error when saving fails", async () => {
    const chords = [{ id: "seg-1", startTime: 0, endTime: 5, root: "C", chordType: "major" }];
    vi.mocked(fetch).mockImplementation((_input, init) => {
      if (init?.method === "PATCH") {
        return Promise.resolve(new Response(JSON.stringify({ message: "nope" }), { status: 400 }));
      }
      return Promise.resolve(new Response(JSON.stringify(chords), { status: 200 }));
    });

    renderTrackView("track-1");
    await screen.findByText("C major");
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await screen.findByText(/failed to update chord segment/i);
    expect(screen.getByRole("combobox", { name: /^root$/i })).toBeInTheDocument();
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
