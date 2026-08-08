import { handler, requireAuth, parseJson, ok, errors } from "@/lib/http";
import { updateIdea, deleteIdea } from "@/lib/ideas";
import { updateIdeaSchema } from "@/lib/validation";

export const runtime = "nodejs";

// PATCH /api/v1/ideas/[ideaId] — edit the text, tick it off, or link the
// recipe it turned into.
export const PATCH = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { ideaId } = await ctx.params;
  const patch = await parseJson(req, updateIdeaSchema);
  try {
    return ok(await updateIdea(auth.householdId, ideaId, patch));
  } catch (err) {
    if (err instanceof Error && err.message === "not_found")
      return errors.notFound("Idea not found");
    if (err instanceof Error && err.message === "recipe_not_found")
      return errors.badRequest("That recipe isn't in this household");
    throw err;
  }
});

// DELETE /api/v1/ideas/[ideaId]
export const DELETE = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { ideaId } = await ctx.params;
  const deleted = await deleteIdea(auth.householdId, ideaId);
  if (!deleted) return errors.notFound("Idea not found");
  return ok({ ok: true });
});
