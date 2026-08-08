import { handler, requireAuth, parseJson, ok, created, errors } from "@/lib/http";
import { listRecipes } from "@/lib/recipe-queries";
import { createRecipe, RecipeCycleError } from "@/lib/recipes";
import { recipeInputSchema } from "@/lib/validation";
import type { MealType } from "@prisma/client";

export const runtime = "nodejs";

// GET /api/v1/recipes?q=&tag=&mealType=
export const GET = handler(async (req) => {
  const auth = await requireAuth(req);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const tag = url.searchParams.get("tag") ?? undefined;
  const mealTypeRaw = url.searchParams.get("mealType");
  const mealType =
    mealTypeRaw && ["BREAKFAST", "LUNCH", "DINNER"].includes(mealTypeRaw)
      ? (mealTypeRaw as MealType)
      : undefined;

  const recipes = await listRecipes(auth.householdId, { q, tag, mealType });
  return ok(recipes);
});

// POST /api/v1/recipes
export const POST = handler(async (req) => {
  const auth = await requireAuth(req);
  const input = await parseJson(req, recipeInputSchema);
  try {
    const id = await createRecipe(auth.householdId, input);
    return created({ id });
  } catch (err) {
    if (err instanceof RecipeCycleError) return errors.conflict(err.message);
    throw err;
  }
});
