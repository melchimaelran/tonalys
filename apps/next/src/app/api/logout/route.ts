import { NextResponse } from "next/server";

// Clears the auth cookie set by /api/login. No nest call — the JWT is
// stateless, signing out is purely dropping the cookie client-side.
export async function POST(request: Request) {
  // Same scheme detection as /api/login: production mode != HTTPS until
  // TON-048's reverse proxy terminates TLS.
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const isHttps =
    forwardedProto === "https" || new URL(request.url).protocol === "https:";

  const response = NextResponse.json({ ok: true });
  response.cookies.set("token", "", {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
