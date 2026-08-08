import { handler, requireAuth, parseJson, created, errors } from "@/lib/http";
import { addEntry } from "@/lib/meal-plans";
import { addEntrySchema } from "@/lib/validation";
import { normalizeWeekStart } from "@/lib/week";

export const runtime = "nodejs";

// POST /api/v1/meal-plans/[weekStart]/entries — add an entry to a slot.
export const POST = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { weekStart } = await ctx.params;
  const normalized = normalizeWeekStart(weekStart);
  if (!normalized) return errors.badRequest("Invalid week.");

  const input = await parseJson(req, addEntrySchema);
  try {
    const entry = await addEntry(auth.householdId, normalized, input);
    return created(entry);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "recipe_not_found")
        return errors.badRequest("That recipe doesn't exist.");
      if (err.message === "assignee_not_found")
        return errors.badRequest("That person isn't in your household.");
      if (err.message === "recipe_required")
        return errors.badRequest("A recipe is required.");
    }
    throw err;
  }
});
