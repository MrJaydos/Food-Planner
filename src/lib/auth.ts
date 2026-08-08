import { cookies, headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { env } from "./env";
import { generateToken, hashToken } from "./tokens";

export const SESSION_COOKIE = "fp_session";
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface AuthContext {
  sessionId: string;
  token: string; // only present when freshly issued
  userId: string;
  householdId: string;
  user: { id: string; email: string; name: string | null };
}

// --- Session lifecycle ----------------------------------------------------

export async function createSession(
  userId: string,
  householdId: string,
  userAgent?: string | null,
): Promise<{ token: string; sessionId: string }> {
  const token = generateToken();
  const session = await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      activeHouseholdId: householdId,
      userAgent: userAgent ?? null,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return { token, sessionId: session.id };
}

async function loadSession(rawToken: string | undefined | null) {
  if (!rawToken) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  // Best-effort lastUsedAt refresh (throttled to avoid a write per request).
  if (Date.now() - session.lastUsedAt.getTime() > 60 * 60 * 1000) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
  }
  return session;
}

function toContext(session: {
  id: string;
  userId: string;
  activeHouseholdId: string;
  user: { id: string; email: string; name: string | null };
}): AuthContext {
  return {
    sessionId: session.id,
    token: "",
    userId: session.userId,
    householdId: session.activeHouseholdId,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  };
}

// --- Resolving the current user ------------------------------------------

/** For route handlers that receive a NextRequest (supports bearer + cookie). */
export async function getAuthFromRequest(
  req: NextRequest,
): Promise<AuthContext | null> {
  const bearer = req.headers.get("authorization");
  const bearerToken = bearer?.toLowerCase().startsWith("bearer ")
    ? bearer.slice(7).trim()
    : undefined;
  const cookieToken = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await loadSession(bearerToken ?? cookieToken);
  return session ? toContext(session) : null;
}

/** For server components / server actions (cookie + bearer via next/headers). */
export async function getServerAuth(): Promise<AuthContext | null> {
  const hdrs = await headers();
  const bearer = hdrs.get("authorization");
  const bearerToken = bearer?.toLowerCase().startsWith("bearer ")
    ? bearer.slice(7).trim()
    : undefined;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await loadSession(bearerToken ?? cookieToken);
  return session ? toContext(session) : null;
}

export async function destroySession(sessionId: string): Promise<void> {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
}

// --- Cookie helpers -------------------------------------------------------

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProduction,
    path: "/",
    maxAge: 0,
  });
}
