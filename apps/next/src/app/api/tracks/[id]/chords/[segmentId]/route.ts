import { NextRequest, NextResponse } from "next/server";
import { resolveApiAuth } from "@/lib/api-auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; segmentId: string }> },
) {
  const auth = resolveApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id, segmentId } = await params;
  const body = await request.text();

  let nestResponse: Response;
  try {
    nestResponse = await fetch(`${process.env.NEST_API_URL}/tracks/${id}/chords/${segmentId}`, {
      method: "PATCH",
      headers: {
        ...auth.authHeaders,
        "Content-Type": "application/json",
      },
      body,
    });
  } catch {
    return NextResponse.json({ message: "Analysis service unavailable" }, { status: 502 });
  }

  let data: unknown;
  try {
    data = await nestResponse.json();
  } catch {
    return NextResponse.json({ message: "Analysis service unavailable" }, { status: 502 });
  }

  return NextResponse.json(data, { status: nestResponse.status });
}
