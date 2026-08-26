import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function makeRequest(cookie?: string) {
  return new NextRequest(new URL("/api/tracks/track-1/audio", "http://localhost"), {
    headers: cookie ? { cookie } : undefined,
  });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/tracks/[id]/audio", () => {
  beforeEach(() => {
    vi.stubEnv("NEST_API_URL", "http://nest-test:3001");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 401 without a token cookie", async () => {
    const response = await GET(makeRequest(), makeContext("track-1"));

    expect(response.status).toBe(401);
  });

  it("forwards the token and streams the audio body with its content type", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      }),
    );

    const response = await GET(makeRequest("token=signed-jwt"), makeContext("track-1"));

    expect(fetch).toHaveBeenCalledWith("http://nest-test:3001/tracks/track-1/audio", {
      headers: { Authorization: "Bearer signed-jwt" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("forwards a Range header from the browser and passes through a 206 response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Uint8Array([4, 5]), {
        status: 206,
        headers: { "Content-Type": "audio/mpeg", "Content-Range": "bytes 2-3/10" },
      }),
    );
    const request = new NextRequest(new URL("/api/tracks/track-1/audio", "http://localhost"), {
      headers: { cookie: "token=signed-jwt", range: "bytes=2-3" },
    });

    const response = await GET(request, makeContext("track-1"));

    expect(fetch).toHaveBeenCalledWith("http://nest-test:3001/tracks/track-1/audio", {
      headers: { Authorization: "Bearer signed-jwt", Range: "bytes=2-3" },
    });
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 2-3/10");
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
});
