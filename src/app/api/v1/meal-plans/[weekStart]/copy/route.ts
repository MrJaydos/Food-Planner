import { handler, requireAuth, parseJson, ok, errors } from "@/lib/http";
import { copyWeek } from "@/lib/meal-plans";
import { copyWeekSchema } from "@/lib/validation";
import { normalizeWeekStart } from "@/lib/week";

export const runtime = "nodejs";

// POST /api/v1/meal-plans/[weekStart]/copy — copy entries from another week.
export const POST = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { weekStart } = await ctx.params;
  const target = normalizeWeekStart(weekStart);
  if (!target) return errors.badRequest("Invalid week.");

  const { fromWeekStart } = await parseJson(req, copyWeekSchema);
  const source = normalizeWeekStart(fromWeekStart);
  if (!source) return errors.badRequest("Invalid source week.");
  if (source === target) return errors.badRequest("Choose a different week.");

  const copied = await copyWeek(auth.householdId, target, source);
  return ok({ copied });
});
