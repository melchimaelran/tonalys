import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function makeRequest(cookie?: string) {
  return new NextRequest(new URL("/api/tracks/track-1", "http://localhost"), {
    headers: cookie ? { cookie } : undefined,
  });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/tracks/[id]", () => {
  beforeEach(() => {
    vi.stubEnv("NEST_API_URL", "http://nest-test:3001");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 401 without a token cookie", async () => {
    const response = await GET(makeRequest(), makeContext("track-1"));

    expect(response.status).toBe(401);
  });

  it("forwards the token and returns the track", async () => {
    const track = { id: "track-1", title: "My Song.mp3" };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(track), { status: 200 }));

    const response = await GET(makeRequest("token=signed-jwt"), makeContext("track-1"));

    expect(fetch).toHaveBeenCalledWith("http://nest-test:3001/tracks/track-1", {
      headers: { Authorization: "Bearer signed-jwt" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(track);
  });

  it("returns 404 when nest reports the track doesn't exist", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "Track not found" }), { status: 404 }),
    );

    const response = await GET(makeRequest("token=signed-jwt"), makeContext("unknown"));

    expect(response.status).toBe(404);
  });

  it("returns 502 when the analysis service is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("fetch failed"));

    const response = await GET(makeRequest("token=signed-jwt"), makeContext("track-1"));

    expect(response.status).toBe(502);
  });

  it("returns 502 when nest responds with a non-JSON body", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 200 }));

    const response = await GET(makeRequest("token=signed-jwt"), makeContext("track-1"));

    expect(response.status).toBe(502);
  });
});
