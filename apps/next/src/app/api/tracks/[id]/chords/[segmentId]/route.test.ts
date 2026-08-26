import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "./route";

function makeRequest(body: unknown, cookie?: string) {
  return new NextRequest(
    new URL("/api/tracks/track-1/chords/seg-1", "http://localhost"),
    {
      method: "PATCH",
      headers: {
        ...(cookie ? { cookie } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

function makeContext(id: string, segmentId: string) {
  return { params: Promise.resolve({ id, segmentId }) };
}

describe("PATCH /api/tracks/[id]/chords/[segmentId]", () => {
  beforeEach(() => {
    vi.stubEnv("NEST_API_URL", "http://nest-test:3001");
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns 401 without a token cookie", async () => {
    const response = await PATCH(
      makeRequest({ root: "G", chordType: "minor" }),
      makeContext("track-1", "seg-1"),
    );

    expect(response.status).toBe(401);
  });

  it("forwards the token and body, returning the updated segment", async () => {
    const updated = { id: "seg-1", startTime: 0, endTime: 2.5, root: "G", chordType: "minor" };
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(updated), { status: 200 }));

    const response = await PATCH(
      makeRequest({ root: "G", chordType: "minor" }, "token=signed-jwt"),
      makeContext("track-1", "seg-1"),
    );

    expect(fetch).toHaveBeenCalledWith(
      "http://nest-test:3001/tracks/track-1/chords/seg-1",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer signed-jwt",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ root: "G", chordType: "minor" }),
      },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(updated);
  });

  it("returns 404 when nest reports the segment doesn't exist", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "Chord segment not found" }), { status: 404 }),
    );

    const response = await PATCH(
      makeRequest({ root: "G", chordType: "minor" }, "token=signed-jwt"),
      makeContext("track-1", "unknown"),
    );

    expect(response.status).toBe(404);
  });

  it("returns 502 when the analysis service is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("fetch failed"));

    const response = await PATCH(
      makeRequest({ root: "G", chordType: "minor" }, "token=signed-jwt"),
      makeContext("track-1", "seg-1"),
    );

    expect(response.status).toBe(502);
  });

  it("returns 502 when nest responds with a non-JSON body", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 200 }));

    const response = await PATCH(
      makeRequest({ root: "G", chordType: "minor" }, "token=signed-jwt"),
      makeContext("track-1", "seg-1"),
    );

    expect(response.status).toBe(502);
  });
});
