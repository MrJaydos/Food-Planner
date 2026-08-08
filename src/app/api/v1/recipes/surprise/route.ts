import { handler, requireAuth, ok, errors } from "@/lib/http";
import { surprisePick } from "@/lib/suggestions";
import type { MealType } from "@prisma/client";

export const runtime = "nodejs";

// GET /api/v1/recipes/surprise?mealType=&exclude=
// Weighted-random recipe suggestion (favours not-recently-used). Re-roll by
// passing the previous pick as `exclude`.
export const GET = handler(async (req) => {
  const auth = await requireAuth(req);
  const url = new URL(req.url);
  const mealTypeRaw = url.searchParams.get("mealType");
  const mealType =
    mealTypeRaw && ["BREAKFAST", "LUNCH", "DINNER"].includes(mealTypeRaw)
      ? (mealTypeRaw as MealType)
      : undefined;
  const excludeId = url.searchParams.get("exclude") ?? undefined;

  const pick = await surprisePick(auth.householdId, { mealType, excludeId });
  if (!pick) return errors.notFound("No recipes to choose from yet.");
  return ok(pick);
});
