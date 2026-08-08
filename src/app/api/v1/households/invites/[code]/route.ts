import { handler, ok, errors } from "@/lib/http";
import { getInvitePreview } from "@/lib/accounts";

export const runtime = "nodejs";

// GET /api/v1/households/invites/[code] — preview an invite (name of household).
export const GET = handler(async (_req, ctx) => {
  const { code } = await ctx.params;
  const preview = await getInvitePreview(code);
  if (!preview) return errors.notFound("This invite is invalid or expired.");
  return ok(preview);
});
