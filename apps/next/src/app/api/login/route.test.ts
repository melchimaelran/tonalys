import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

describe("POST /api/login", () => {
  beforeEach(() => {
    vi.stubEnv("NEST_API_URL", "http://nest-test:3001");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 400 when password is missing", async () => {
    const request = new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("sets an httpOnly cookie and returns 200 when the password is correct", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ access_token: "signed-jwt-token" }), {
        status: 201,
      }),
    );

    const request = new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ password: "correct-password" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const cookie = response.cookies.get("token");
    expect(cookie?.value).toBe("signed-jwt-token");
    expect(cookie?.httpOnly).toBe(true);
  });

  it("does not mark the cookie secure over a plain HTTP request", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ access_token: "signed-jwt-token" }), { status: 201 }),
    );

    const request = new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ password: "correct-password" }),
    });

    const response = await POST(request);

    expect(response.cookies.get("token")?.secure).toBe(false);
  });

  it("marks the cookie secure when the request arrives via HTTPS (x-forwarded-proto)", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ access_token: "signed-jwt-token" }), { status: 201 }),
    );

    const request = new Request("http://localhost/api/login", {
      method: "POST",
      headers: { "x-forwarded-proto": "https" },
      body: JSON.stringify({ password: "correct-password" }),
    });

    const response = await POST(request);

    expect(response.cookies.get("token")?.secure).toBe(true);
  });

  it("returns 401 when the password is wrong", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));

    const request = new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ password: "wrong-password" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });

  it("returns 400 when the request body is not valid JSON", async () => {
    const request = new Request("http://localhost/api/login", {
      method: "POST",
      body: "not json",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 502 when the auth service is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("fetch failed"));

    const request = new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ password: "correct-password" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(502);
  });

  it("returns 502 (not 401) when the auth service errors for a reason other than a wrong password", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 500 }));

    const request = new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ password: "correct-password" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(502);
  });

  it("returns 502 when the auth service responds 2xx with a non-JSON body", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 200 }));

    const request = new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ password: "correct-password" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(502);
  });
});
