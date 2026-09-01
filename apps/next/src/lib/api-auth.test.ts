import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { resolveApiAuth } from "./api-auth";

function makeRequest(cookie?: string) {
  return new NextRequest(new URL("/api/anything", "http://localhost"), {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("resolveApiAuth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows the request with no auth header when AUTH_ENABLED is 'false'", () => {
    vi.stubEnv("AUTH_ENABLED", "false");

    const result = resolveApiAuth(makeRequest());

    expect(result).toEqual({ ok: true, authHeaders: {} });
  });

  it("rejects with a 401 response when auth is on and no token cookie is present", async () => {
    const result = resolveApiAuth(makeRequest());

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected rejection");
    expect(result.response.status).toBe(401);
    expect(await result.response.json()).toEqual({ message: "Not authenticated" });
  });

  it("forwards the token as a Bearer header when auth is on and the cookie is present", () => {
    const result = resolveApiAuth(makeRequest("token=signed-jwt"));

    expect(result).toEqual({
      ok: true,
      authHeaders: { Authorization: "Bearer signed-jwt" },
    });
  });
});
