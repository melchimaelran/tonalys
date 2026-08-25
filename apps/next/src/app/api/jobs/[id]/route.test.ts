import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

function makeRequest(cookie?: string) {
  return new NextRequest(new URL("/api/jobs/job-1", "http://localhost"), {
    headers: cookie ? { cookie } : undefined,
  });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/jobs/[id]", () => {
  beforeEach(() => {
    vi.stubEnv("NEST_API_URL", "http://nest-test:3001");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 401 without a token cookie", async () => {
    const response = await GET(makeRequest(), makeContext("job-1"));

    expect(response.status).toBe(401);
  });

  it("forwards the token and job id to nest, returning the job status", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "job-1",
          trackId: "track-1",
          status: "PROCESSING",
          errorMessage: null,
        }),
        { status: 200 },
      ),
    );

    const response = await GET(makeRequest("token=signed-jwt"), makeContext("job-1"));

    expect(fetch).toHaveBeenCalledWith("http://nest-test:3001/jobs/job-1", {
      headers: { Authorization: "Bearer signed-jwt" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: "job-1",
      trackId: "track-1",
      status: "PROCESSING",
      errorMessage: null,
    });
  });

  it("returns 404 when nest reports the job doesn't exist", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "Job not found" }), { status: 404 }),
    );

    const response = await GET(makeRequest("token=signed-jwt"), makeContext("unknown"));

    expect(response.status).toBe(404);
  });

  it("returns 502 when the analysis service is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("fetch failed"));

    const response = await GET(makeRequest("token=signed-jwt"), makeContext("job-1"));

    expect(response.status).toBe(502);
  });

  it("returns 502 when nest responds with a non-JSON body", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 200 }));

    const response = await GET(makeRequest("token=signed-jwt"), makeContext("job-1"));

    expect(response.status).toBe(502);
  });
});
