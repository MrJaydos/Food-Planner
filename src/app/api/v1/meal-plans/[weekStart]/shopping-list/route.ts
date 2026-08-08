import { handler, requireAuth, ok, errors } from "@/lib/http";
import { getShoppingListByWeek } from "@/lib/shopping-queries";
import { normalizeWeekStart } from "@/lib/week";

export const runtime = "nodejs";

// GET /api/v1/meal-plans/[weekStart]/shopping-list — existing list or null.
export const GET = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { weekStart } = await ctx.params;
  const normalized = normalizeWeekStart(weekStart);
  if (!normalized) return errors.badRequest("Invalid week.");
  const list = await getShoppingListByWeek(auth.householdId, normalized);
  return ok(list);
});
