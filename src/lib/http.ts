import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { getAuthFromRequest, type AuthContext } from "./auth";

// Consistent JSON envelopes for the /api/v1 surface so a future native client
// (or generated OpenAPI client) sees predictable shapes.

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 });
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  const body: ApiErrorBody = { error: { code, message, details } };
  return NextResponse.json(body, { status });
}

export const errors = {
  unauthorized: (message = "Authentication required") =>
    apiError("unauthorized", message, 401),
  forbidden: (message = "Not allowed") => apiError("forbidden", message, 403),
  notFound: (message = "Not found") => apiError("not_found", message, 404),
  badRequest: (message = "Bad request", details?: unknown) =>
    apiError("bad_request", message, 400, details),
  conflict: (message = "Conflict") => apiError("conflict", message, 409),
  rateLimited: (message: string, retryAfterSeconds: number) =>
    NextResponse.json(
      { error: { code: "rate_limited", message } },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    ),
  server: (message = "Something went wrong") =>
    apiError("server_error", message, 500),
};

/** Parse+validate a JSON body; returns data or throws a Response. */
export async function parseJson<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw errors.badRequest("Invalid JSON body");
  }
  try {
    return schema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      throw errors.badRequest("Validation failed", err.flatten());
    }
    throw err;
  }
}

/** Resolve auth or throw a 401 Response. */
export async function requireAuth(req: NextRequest): Promise<AuthContext> {
  const auth = await getAuthFromRequest(req);
  if (!auth) throw errors.unauthorized();
  return auth;
}

/**
 * Wrap a route handler so thrown Responses (from requireAuth/parseJson) and
 * unexpected errors become clean JSON responses.
 */
export function handler(
  fn: (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>,
) {
  return async (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof NextResponse) return err;
      // Some thrown values may be a Response (from helpers above).
      if (err instanceof Response) return err as NextResponse;
      console.error("[api] unhandled error:", err);
      return errors.server();
    }
  };
}

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
