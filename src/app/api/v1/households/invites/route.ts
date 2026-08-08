import { z } from "zod";
import { handler, requireAuth, parseJson, ok, errors } from "@/lib/http";
import { createInvite } from "@/lib/accounts";
import { getMembershipId } from "@/lib/context";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email().optional(),
});

// POST /api/v1/households/invites — create a partner invite for the active household.
export const POST = handler(async (req) => {
  const auth = await requireAuth(req);
  const membershipId = await getMembershipId(auth);
  if (!membershipId) return errors.forbidden();

  const { email } = await parseJson(req, schema);
  const { code, expiresAt } = await createInvite(
    auth.householdId,
    membershipId,
    email,
  );
  const url = `${env.appUrl}/invite/${code}`;
  return ok({ code, url, expiresAt });
});
