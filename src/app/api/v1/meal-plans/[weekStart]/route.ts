import { handler, requireAuth, ok, errors } from "@/lib/http";
import { getWeekPlan } from "@/lib/meal-plans";
import { normalizeWeekStart } from "@/lib/week";

export const runtime = "nodejs";

// GET /api/v1/meal-plans/[weekStart] — the week's plan (empty structure if none).
export const GET = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { weekStart } = await ctx.params;
  const normalized = normalizeWeekStart(weekStart);
  if (!normalized) return errors.badRequest("Invalid week.");
  const plan = await getWeekPlan(auth.householdId, normalized);
  return ok(plan);
});
