import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function makeRequest(pathname: string, cookie?: string) {
  return new NextRequest(new URL(pathname, "http://localhost"), {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("proxy", () => {
  it("redirects to /login when no token cookie is present on a protected route", () => {
    const response = proxy(makeRequest("/upload"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("lets the request through when a token cookie is present", () => {
    const response = proxy(makeRequest("/upload", "token=signed-jwt"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("never redirects /login itself, even without a cookie", () => {
    const response = proxy(makeRequest("/login"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("never redirects /api/login, even without a cookie", () => {
    const response = proxy(makeRequest("/api/login"));

    expect(response.headers.get("location")).toBeNull();
  });
});
