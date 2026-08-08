import { NextResponse, type NextRequest } from "next/server";
import { consumeMagicLink, isSafeRedirect } from "@/lib/magic-link";
import { findOrCreateUserWithHousehold } from "@/lib/accounts";
import { createSession, setSessionCookie } from "@/lib/auth";
import { env } from "@/lib/env";

export const runtime = "nodejs";

// GET /api/v1/auth/callback?token=...&redirect=...
// Browser magic-link entry point: consumes the token, establishes a session
// cookie, then redirects into the app.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const redirectParam = url.searchParams.get("redirect");
  const redirectTo =
    redirectParam && isSafeRedirect(redirectParam) ? redirectParam : "/app";

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid", env.appUrl));
  }

  const email = await consumeMagicLink(token);
  if (!email) {
    return NextResponse.redirect(new URL("/login?error=expired", env.appUrl));
  }

  const { userId, householdId } = await findOrCreateUserWithHousehold(email);
  const { token: sessionToken } = await createSession(
    userId,
    householdId,
    req.headers.get("user-agent"),
  );

  const res = NextResponse.redirect(new URL(redirectTo, env.appUrl));
  setSessionCookie(res, sessionToken);
  return res;
}
