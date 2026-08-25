import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };

  if (!password) {
    return NextResponse.json({ message: "Password is required" }, { status: 400 });
  }

  const nestResponse = await fetch(`${process.env.NEST_API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!nestResponse.ok) {
    return NextResponse.json({ message: "Invalid password" }, { status: 401 });
  }

  const { access_token } = (await nestResponse.json()) as { access_token: string };

  const response = NextResponse.json({ ok: true });
  response.cookies.set("token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}
