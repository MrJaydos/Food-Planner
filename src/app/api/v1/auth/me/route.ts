import { z } from "zod";
import { handler, requireAuth, parseJson, ok, errors } from "@/lib/http";
import { loadCurrentContext } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { getAuthFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/v1/auth/me — current user, household and members.
export const GET = handler(async (req) => {
  const auth = await getAuthFromRequest(req);
  if (!auth) return ok(null); // not signed in — soft null so the UI can branch
  const ctx = await loadCurrentContext(auth);
  if (!ctx) return errors.unauthorized("Session no longer valid");
  return ok(ctx);
});

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).nullable().optional(),
  householdName: z.string().trim().min(1).max(120).optional(),
});

// PATCH /api/v1/auth/me — update the user's name and/or rename the household.
export const PATCH = handler(async (req) => {
  const auth = await requireAuth(req);
  const { name, householdName } = await parseJson(req, patchSchema);

  if (name !== undefined) {
    await prisma.user.update({ where: { id: auth.userId }, data: { name } });
  }
  if (householdName !== undefined) {
    await prisma.household.update({
      where: { id: auth.householdId },
      data: { name: householdName },
    });
  }

  const refreshed = await getAuthFromRequest(req);
  const ctx = refreshed ? await loadCurrentContext(refreshed) : null;
  return ok(ctx);
});
