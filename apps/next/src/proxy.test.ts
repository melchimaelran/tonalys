import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function makeRequest(pathname: string, cookie?: string) {
  return new NextRequest(new URL(pathname, "http://localhost"), {
    headers: cookie ? { cookie } : undefined,
  });
}

function makeJwt(payload: Record<string, unknown>) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.fake-signature`;
}

describe("proxy", () => {
  it("redirects to /login when no token cookie is present on a protected route", () => {
    const response = proxy(makeRequest("/upload"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("lets the request through when the token is a JWT with a future exp", () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) + 3600 });
    const response = proxy(makeRequest("/upload", `token=${token}`));

    expect(response.headers.get("location")).toBeNull();
  });

  it("lets the request through when the token has no exp claim (nest validates the signature)", () => {
    const token = makeJwt({ sub: "user" });
    const response = proxy(makeRequest("/upload", `token=${token}`));

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects to /login when the token is an expired JWT", () => {
    const token = makeJwt({ exp: Math.floor(Date.now() / 1000) - 3600 });
    const response = proxy(makeRequest("/upload", `token=${token}`));

    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("redirects to /login when the token cookie is not a decodable JWT", () => {
    const response = proxy(makeRequest("/upload", "token=not-a-jwt"));

    expect(response.headers.get("location")).toBe("http://localhost/login");
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
