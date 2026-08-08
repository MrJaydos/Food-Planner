import { handler, requireAuth, ok, errors } from "@/lib/http";
import { generateShoppingList } from "@/lib/shopping";
import { getShoppingListByWeek } from "@/lib/shopping-queries";
import { normalizeWeekStart } from "@/lib/week";

export const runtime = "nodejs";

// POST /api/v1/meal-plans/[weekStart]/shopping-list/generate
// (Re)generate the list from the week's plan, preserving checked state + manual
// items. Returns the resulting list.
export const POST = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { weekStart } = await ctx.params;
  const normalized = normalizeWeekStart(weekStart);
  if (!normalized) return errors.badRequest("Invalid week.");

  const listId = await generateShoppingList(auth.householdId, normalized);
  if (!listId) {
    return errors.badRequest(
      "There's nothing to shop for — add some recipes to this week's plan first.",
    );
  }
  const list = await getShoppingListByWeek(auth.householdId, normalized);
  return ok(list);
});
