import { NextResponse } from "next/server";
import { handler, requireAuth } from "@/lib/http";
import { destroySession, clearSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/v1/auth/logout — destroy the current session.
export const POST = handler(async (req) => {
  const auth = await requireAuth(req);
  await destroySession(auth.sessionId);
  const res = NextResponse.json({ data: { ok: true } });
  clearSessionCookie(res);
  return res;
});
