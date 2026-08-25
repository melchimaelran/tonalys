import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function makeRequest(formData: FormData, cookie?: string) {
  // Stub .formData() directly rather than passing the FormData as the
  // actual request body — the real encode (NextRequest constructor) →
  // decode (request.formData() in the route handler) round trip hits an
  // undici/Node File realm mismatch in this test environment unrelated
  // to the route handler's own logic under test.
  const request = new NextRequest(new URL("/api/upload", "http://localhost"), {
    method: "POST",
    headers: cookie ? { cookie } : undefined,
  });
  vi.spyOn(request, "formData").mockResolvedValue(formData);
  return request;
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.stubEnv("NEST_API_URL", "http://nest-test:3001");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 401 without a token cookie", async () => {
    const formData = new FormData();
    formData.append("file", new File(["audio"], "track.mp3"));

    const response = await POST(makeRequest(formData));

    expect(response.status).toBe(401);
  });

  it("forwards the multipart body and token to nest", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ id: "track-1", title: "track.mp3", status: "PENDING" }),
        { status: 201 },
      ),
    );
    const formData = new FormData();
    formData.append("file", new File(["audio"], "track.mp3"));

    const response = await POST(makeRequest(formData, "token=signed-jwt"));

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://nest-test:3001/upload");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer signed-jwt",
    );
    expect(init.body).toBeInstanceOf(FormData);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: "track-1",
      title: "track.mp3",
      status: "PENDING",
    });
  });

  it("passes through a 400 from nest (e.g. no file, oversized file)", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "No file provided" }), { status: 400 }),
    );

    const response = await POST(makeRequest(new FormData(), "token=signed-jwt"));

    expect(response.status).toBe(400);
  });

  it("returns 502 when the analysis service is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("fetch failed"));
    const formData = new FormData();
    formData.append("file", new File(["audio"], "track.mp3"));

    const response = await POST(makeRequest(formData, "token=signed-jwt"));

    expect(response.status).toBe(502);
  });
});
