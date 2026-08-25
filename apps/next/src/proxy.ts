import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/login"];

// Cheap expiry check only — no signature verification (that needs
// JWT_SECRET, which next doesn't and shouldn't hold). nest's
// jwt-auth.guard.ts is the real validation boundary; this just avoids
// serving the page shell behind an obviously expired/malformed cookie.
function isTokenExpired(token: string): boolean {
  const payload = token.split(".")[1];
  if (!payload) return true;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as {
      exp?: number;
    };
    if (typeof decoded.exp !== "number") return false;
    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function proxy(request: NextRequest) {
  if (PUBLIC_PATHS.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  if (!token || isTokenExpired(token)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
