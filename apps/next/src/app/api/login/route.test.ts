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

  it("returns 401 when the password is wrong", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 401 }));

    const request = new Request("http://localhost/api/login", {
      method: "POST",
      body: JSON.stringify({ password: "wrong-password" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});
