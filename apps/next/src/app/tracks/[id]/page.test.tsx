import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import TrackPage from "./page";

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("TrackPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify([])))),
    );
  });

  it("renders an AudioPlayer pointed at the track's audio endpoint", async () => {
    const ui = await TrackPage({ params: Promise.resolve({ id: "track-1" }) });
    render(ui, { wrapper: Wrapper });

    const audio = document.querySelector("audio");
    expect(audio).toHaveAttribute("src", "/api/tracks/track-1/audio");
  });
});
