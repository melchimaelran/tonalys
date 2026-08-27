import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTracks } from "./use-tracks";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useTracks", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("fetches the track list from /api/tracks", async () => {
    const tracks = [
      { id: "track-2", title: "Newer.mp3", status: "READY" },
      { id: "track-1", title: "Older.mp3", status: "PROCESSING" },
    ];
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(tracks), { status: 200 }),
    );

    const { result } = renderHook(() => useTracks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toEqual(tracks));
    expect(fetch).toHaveBeenCalledWith("/api/tracks");
  });

  it("errors out when the response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("nope", { status: 502 }));

    const { result } = renderHook(() => useTracks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("errors out cleanly when the response body isn't valid JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 200 }));

    const { result } = renderHook(() => useTracks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
