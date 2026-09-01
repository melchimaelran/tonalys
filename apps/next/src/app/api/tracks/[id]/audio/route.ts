import { NextRequest, NextResponse } from "next/server";
import { resolveApiAuth } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = resolveApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;

  const headers: Record<string, string> = { ...auth.authHeaders };
  const range = request.headers.get("range");
  if (range) {
    headers.Range = range;
  }

  let nestResponse: Response;
  try {
    nestResponse = await fetch(`${process.env.NEST_API_URL}/tracks/${id}/audio`, {
      headers,
    });
  } catch {
    return NextResponse.json({ message: "Analysis service unavailable" }, { status: 502 });
  }

  const body = await nestResponse.arrayBuffer();

  return new NextResponse(body, {
    status: nestResponse.status,
    headers: nestResponse.headers,
  });
}
