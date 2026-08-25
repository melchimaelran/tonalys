import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(body: unknown, cookie?: string) {
  return new NextRequest(new URL("/api/youtube", "http://localhost"), {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
    body: JSON.stringify(body),
  });
}

describe("POST /api/youtube", () => {
  beforeEach(() => {
    vi.stubEnv("NEST_API_URL", "http://nest-test:3001");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 401 without a token cookie", async () => {
    const response = await POST(
      makeRequest({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }),
    );

    expect(response.status).toBe(401);
  });

  it("forwards the URL and token to nest", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ id: "track-1", title: "A song", status: "PENDING" }),
        { status: 201 },
      ),
    );

    const response = await POST(
      makeRequest(
        { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
        "token=signed-jwt",
      ),
    );

    expect(fetch).toHaveBeenCalledWith("http://nest-test:3001/youtube", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer signed-jwt",
      },
      body: JSON.stringify({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: "track-1",
      title: "A song",
      status: "PENDING",
    });
  });

  it("passes through a 400 from nest (invalid/unavailable/too-long video)", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "Video is unavailable or private" }), {
        status: 400,
      }),
    );

    const response = await POST(
      makeRequest({ url: "https://www.youtube.com/watch?v=00000000000" }, "token=signed-jwt"),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    const request = new NextRequest(new URL("/api/youtube", "http://localhost"), {
      method: "POST",
      headers: { cookie: "token=signed-jwt" },
      body: "not json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 502 when the analysis service is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("fetch failed"));

    const response = await POST(
      makeRequest({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, "token=signed-jwt"),
    );

    expect(response.status).toBe(502);
  });

  it("returns 502 when nest responds with a non-JSON body", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 201 }));

    const response = await POST(
      makeRequest({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, "token=signed-jwt"),
    );

    expect(response.status).toBe(502);
  });
});
