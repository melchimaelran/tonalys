import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function makeRequest(cookie?: string) {
  return new NextRequest(new URL("/api/tracks", "http://localhost"), {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("GET /api/tracks", () => {
  beforeEach(() => {
    vi.stubEnv("NEST_API_URL", "http://nest-test:3001");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 401 without a token cookie", async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
  });

  it("forwards the token and returns the track list", async () => {
    const tracks = [
      { id: "track-2", title: "Newer.mp3", status: "READY" },
      { id: "track-1", title: "Older.mp3", status: "READY" },
    ];
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(tracks), { status: 200 }),
    );

    const response = await GET(makeRequest("token=signed-jwt"));

    expect(fetch).toHaveBeenCalledWith("http://nest-test:3001/tracks", {
      headers: { Authorization: "Bearer signed-jwt" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(tracks);
  });

  it("returns 502 when the analysis service is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("fetch failed"));

    const response = await GET(makeRequest("token=signed-jwt"));

    expect(response.status).toBe(502);
  });

  it("returns 502 when nest responds with a non-JSON body", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 200 }));

    const response = await GET(makeRequest("token=signed-jwt"));

    expect(response.status).toBe(502);
  });
});
