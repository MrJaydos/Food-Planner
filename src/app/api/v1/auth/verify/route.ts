import { z } from "zod";
import { handler, parseJson, ok, errors } from "@/lib/http";
import { consumeMagicLink } from "@/lib/magic-link";
import { findOrCreateUserWithHousehold } from "@/lib/accounts";
import { createSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const schema = z.object({ token: z.string().min(1) });

// POST /api/v1/auth/verify — non-browser (native) magic-link exchange.
// Consumes the token and returns a bearer token instead of a cookie.
export const POST = handler(async (req) => {
  const { token } = await parseJson(req, schema);
  const email = await consumeMagicLink(token);
  if (!email) return errors.badRequest("Invalid or expired sign-in link.");

  const { userId, householdId } = await findOrCreateUserWithHousehold(email);
  const { token: sessionToken } = await createSession(
    userId,
    householdId,
    req.headers.get("user-agent"),
  );

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  return ok({ token: sessionToken, user, householdId });
});
