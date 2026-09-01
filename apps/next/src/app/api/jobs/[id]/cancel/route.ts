import { NextRequest, NextResponse } from "next/server";
import { resolveApiAuth } from "@/lib/api-auth";

// Hit by navigator.sendBeacon when the upload page is closed mid-analysis.
// Fire-and-forget: the browser never reads the response.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = resolveApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;

  let nestResponse: Response;
  try {
    nestResponse = await fetch(`${process.env.NEST_API_URL}/jobs/${id}/cancel`, {
      method: "POST",
      headers: auth.authHeaders,
    });
  } catch {
    return NextResponse.json(
      { message: "Analysis service unavailable" },
      { status: 502 },
    );
  }

  return new NextResponse(null, { status: nestResponse.status });
}
