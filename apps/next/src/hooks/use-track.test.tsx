import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTrack } from "./use-track";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useTrack", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("fetches the track from /api/tracks/:id", async () => {
    const track = { id: "track-1", title: "My Song.mp3" };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(track), { status: 200 }));

    const { result } = renderHook(() => useTrack("track-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(track));
    expect(fetch).toHaveBeenCalledWith("/api/tracks/track-1");
  });

  it("does not fetch when trackId is null", () => {
    renderHook(() => useTrack(null), { wrapper: createWrapper() });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("errors out cleanly when the response body isn't valid JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 200 }));

    const { result } = renderHook(() => useTrack("track-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
