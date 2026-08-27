import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  let nestResponse: Response;
  try {
    nestResponse = await fetch(`${process.env.NEST_API_URL}/tracks`, {
      headers: { Authorization: `Bearer ${token}` },
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
