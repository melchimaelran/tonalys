import { NextRequest, NextResponse } from "next/server";
import { resolveApiAuth } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = resolveApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  let nestResponse: Response;
  try {
    nestResponse = await fetch(`${process.env.NEST_API_URL}/youtube`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...auth.authHeaders },
      body: JSON.stringify(body),
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
