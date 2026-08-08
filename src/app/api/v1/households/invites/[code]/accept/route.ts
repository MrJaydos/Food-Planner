import { handler, requireAuth, ok, errors } from "@/lib/http";
import { acceptInvite } from "@/lib/accounts";
import { prisma } from "@/lib/prisma";
import { loadCurrentContext } from "@/lib/context";

export const runtime = "nodejs";

// POST /api/v1/households/invites/[code]/accept — join the invite's household
// and switch the current session to it.
export const POST = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { code } = await ctx.params;

  const result = await acceptInvite(auth.userId, code);
  if (!result.ok) {
    const message =
      result.reason === "used"
        ? "This invite has already been used."
        : result.reason === "expired"
          ? "This invite has expired."
          : "This invite is invalid.";
    return errors.badRequest(message);
  }

  // Make the joined household the active one for this session.
  await prisma.session.update({
    where: { id: auth.sessionId },
    data: { activeHouseholdId: result.householdId },
  });

  const refreshed = { ...auth, householdId: result.householdId };
  const context = await loadCurrentContext(refreshed);
  return ok({ alreadyMember: result.alreadyMember, context });
});
