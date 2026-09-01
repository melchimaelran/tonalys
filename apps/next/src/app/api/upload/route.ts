import { NextRequest, NextResponse } from "next/server";
import { resolveApiAuth } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = resolveApiAuth(request);
  if (!auth.ok) {
    return auth.response;
  }

  const formData = await request.formData();

  let nestResponse: Response;
  try {
    nestResponse = await fetch(`${process.env.NEST_API_URL}/upload`, {
      method: "POST",
      headers: auth.authHeaders,
      body: formData,
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
