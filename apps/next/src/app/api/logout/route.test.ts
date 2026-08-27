import { describe, it, expect } from "vitest";
import { POST } from "./route";

describe("POST /api/logout", () => {
  it("clears the token cookie and returns 200", async () => {
    const request = new Request("http://localhost/api/logout", { method: "POST" });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const cookie = response.cookies.get("token");
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.path).toBe("/");
  });

  it("does not mark the cleared cookie secure over plain HTTP", async () => {
    const request = new Request("http://localhost/api/logout", { method: "POST" });

    const response = await POST(request);

    expect(response.cookies.get("token")?.secure).toBe(false);
  });

  it("marks the cleared cookie secure when the request arrives via HTTPS (x-forwarded-proto)", async () => {
    const request = new Request("http://localhost/api/logout", {
      method: "POST",
      headers: { "x-forwarded-proto": "https" },
    });

    const response = await POST(request);

    expect(response.cookies.get("token")?.secure).toBe(true);
  });
});
