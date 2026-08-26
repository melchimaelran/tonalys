import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useUpdateChordSegment } from "./use-update-chord-segment";

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useUpdateChordSegment", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("PATCHes the segment and invalidates the track's chords query", async () => {
    const updated = { id: "seg-1", startTime: 0, endTime: 2.5, root: "G", chordType: "minor" };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(updated), { status: 200 }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUpdateChordSegment("track-1"), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ segmentId: "seg-1", root: "G", chordType: "minor" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith("/api/tracks/track-1/chords/seg-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root: "G", chordType: "minor" }),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["chords", "track-1"] });
  });

  it("PATCHes a slash chord with its bass note", async () => {
    const updated = {
      id: "seg-1",
      startTime: 0,
      endTime: 2.5,
      root: "C",
      chordType: "major",
      bassNote: "F",
    };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(updated), { status: 200 }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useUpdateChordSegment("track-1"), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ segmentId: "seg-1", root: "C", chordType: "major", bassNote: "F" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetch).toHaveBeenCalledWith("/api/tracks/track-1/chords/seg-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ root: "C", chordType: "major", bassNote: "F" }),
    });
  });

  it("errors out cleanly when the response isn't ok", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "nope" }), { status: 400 }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useUpdateChordSegment("track-1"), {
      wrapper: createWrapper(queryClient),
    });

    result.current.mutate({ segmentId: "seg-1", root: "G", chordType: "minor" });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
