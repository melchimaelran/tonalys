import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { password } = body;
  if (!password) {
    return NextResponse.json({ message: "Password is required" }, { status: 400 });
  }

  let nestResponse: Response;
  try {
    nestResponse = await fetch(`${process.env.NEST_API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
  } catch {
    return NextResponse.json({ message: "Authentication service unavailable" }, { status: 502 });
  }

  if (!nestResponse.ok) {
    if (nestResponse.status === 401) {
      return NextResponse.json({ message: "Invalid password" }, { status: 401 });
    }
    return NextResponse.json({ message: "Authentication service unavailable" }, { status: 502 });
  }

  let data: { access_token: string };
  try {
    data = (await nestResponse.json()) as { access_token: string };
  } catch {
    return NextResponse.json({ message: "Authentication service unavailable" }, { status: 502 });
  }
  const { access_token } = data;

  const response = NextResponse.json({ ok: true });
  response.cookies.set("token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}
