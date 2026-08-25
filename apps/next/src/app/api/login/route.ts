import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const password =
    body && typeof body === "object" ? (body as { password?: unknown }).password : undefined;
  if (typeof password !== "string" || !password) {
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

  let data: { access_token?: string };
  try {
    data = (await nestResponse.json()) as { access_token?: string };
  } catch {
    return NextResponse.json({ message: "Authentication service unavailable" }, { status: 502 });
  }
  const { access_token } = data;
  if (!access_token) {
    return NextResponse.json({ message: "Authentication service unavailable" }, { status: 502 });
  }

  // NODE_ENV=production doesn't mean HTTPS here — the runner image ships
  // production-mode but TLS termination only lands with TON-048's reverse
  // proxy. Detect the actual scheme instead (x-forwarded-proto once behind it).
  const isHttps =
    request.headers.get("x-forwarded-proto") === "https" ||
    new URL(request.url).protocol === "https:";

  const response = NextResponse.json({ ok: true });
  response.cookies.set("token", access_token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
