import { NextRequest, NextResponse } from "next/server";

type ApiAuth =
  | { ok: true; authHeaders: Record<string, string> }
  | { ok: false; response: NextResponse };

/**
 * Resolves the auth headers a BFF route should forward to nest.
 *
 * When `AUTH_ENABLED` is `"false"` (temporary public access) the request is
 * allowed through with no `Authorization` header — nest's guard is bypassed
 * on that same flag. Otherwise the `token` cookie is required and forwarded
 * as a Bearer token, exactly as before.
 */
export function resolveApiAuth(request: NextRequest): ApiAuth {
  if (process.env.AUTH_ENABLED === "false") {
    return { ok: true, authHeaders: {} };
  }

  const token = request.cookies.get("token")?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 },
      ),
    };
  }

  return { ok: true, authHeaders: { Authorization: `Bearer ${token}` } };
}
