import { handler, requireAuth, ok, errors } from "@/lib/http";
import { suggestOverlapping } from "@/lib/ingredient-overlap";
import { normalizeWeekStart } from "@/lib/week";
import type { MealType } from "@prisma/client";

export const runtime = "nodejs";

// GET /api/v1/meal-plans/[weekStart]/suggestions?mealType=&limit=&exclude=
// Recipes that reuse fresh ingredients already committed to by this week's
// plan — "this uses the rest of the coriander". Empty when nothing is planned.
export const GET = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { weekStart } = await ctx.params;
  const normalized = normalizeWeekStart(weekStart);
  if (!normalized) return errors.badRequest("Invalid week.");

  const url = new URL(req.url);
  const mealTypeRaw = url.searchParams.get("mealType");
  const mealType =
    mealTypeRaw && ["BREAKFAST", "LUNCH", "DINNER"].includes(mealTypeRaw)
      ? (mealTypeRaw as MealType)
      : undefined;

  const limitRaw = Number(url.searchParams.get("limit"));
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 20) : 6;

  const suggestions = await suggestOverlapping(auth.householdId, normalized, {
    mealType,
    limit,
    excludeId: url.searchParams.get("exclude") ?? undefined,
  });
  return ok(suggestions);
});
