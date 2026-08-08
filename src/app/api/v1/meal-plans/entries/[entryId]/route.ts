import { handler, requireAuth, parseJson, ok, errors } from "@/lib/http";
import { updateEntry, deleteEntry } from "@/lib/meal-plans";
import { updateEntrySchema } from "@/lib/validation";

export const runtime = "nodejs";

// PATCH /api/v1/meal-plans/entries/[entryId]
export const PATCH = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { entryId } = await ctx.params;
  const patch = await parseJson(req, updateEntrySchema);
  try {
    const entry = await updateEntry(auth.householdId, entryId, patch);
    return ok(entry);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "not_found") return errors.notFound("Entry not found");
      if (err.message === "assignee_not_found")
        return errors.badRequest("That person isn't in your household.");
    }
    throw err;
  }
});

// DELETE /api/v1/meal-plans/entries/[entryId]
export const DELETE = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { entryId } = await ctx.params;
  try {
    await deleteEntry(auth.householdId, entryId);
    return ok({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "not_found")
      return errors.notFound("Entry not found");
    throw err;
  }
});
