import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(cookie?: string) {
  return new NextRequest(new URL("/api/jobs/job-1/cancel", "http://localhost"), {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
  });
}

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/jobs/[id]/cancel", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NEST_API_URL", "http://nest-test:3001");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 401 without a token cookie", async () => {
    const response = await POST(makeRequest(), makeContext("job-1"));

    expect(response.status).toBe(401);
  });

  it("forwards the cancel to nest and passes its status back", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    const response = await POST(makeRequest("token=signed-jwt"), makeContext("job-1"));

    expect(fetch).toHaveBeenCalledWith("http://nest-test:3001/jobs/job-1/cancel", {
      method: "POST",
      headers: { Authorization: "Bearer signed-jwt" },
    });
    expect(response.status).toBe(204);
  });

  it("forwards without an Authorization header when AUTH_ENABLED is 'false'", async () => {
    vi.stubEnv("AUTH_ENABLED", "false");
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    const response = await POST(makeRequest(), makeContext("job-1"));

    expect(fetch).toHaveBeenCalledWith("http://nest-test:3001/jobs/job-1/cancel", {
      method: "POST",
      headers: {},
    });
    expect(response.status).toBe(204);
  });

  it("returns 502 when nest is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("fetch failed"));

    const response = await POST(makeRequest("token=signed-jwt"), makeContext("job-1"));

    expect(response.status).toBe(502);
  });
});
