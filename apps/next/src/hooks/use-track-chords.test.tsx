import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTrackChords } from "./use-track-chords";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useTrackChords", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("fetches the chord segments from /api/tracks/:id/chords", async () => {
    const chords = [{ id: "seg-1", startTime: 0, endTime: 2, root: "C", chordType: "maj" }];
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(chords), { status: 200 }));

    const { result } = renderHook(() => useTrackChords("track-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(chords));
    expect(fetch).toHaveBeenCalledWith("/api/tracks/track-1/chords");
  });

  it("does not fetch when trackId is null", () => {
    renderHook(() => useTrackChords(null), { wrapper: createWrapper() });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("errors out cleanly when the response body isn't valid JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 200 }));

    const { result } = renderHook(() => useTrackChords("track-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
