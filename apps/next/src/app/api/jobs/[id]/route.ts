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

  let nestResponse: Response;
  try {
    nestResponse = await fetch(`${process.env.NEST_API_URL}/jobs/${id}`, {
      headers: auth.authHeaders,
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
