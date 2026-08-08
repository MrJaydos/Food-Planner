import { handler, requireAuth, parseJson, ok, errors } from "@/lib/http";
import { getRecipeDetail } from "@/lib/recipe-queries";
import { updateRecipe, deleteRecipe, RecipeCycleError } from "@/lib/recipes";
import { recipeInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

// GET /api/v1/recipes/[id]
export const GET = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  const recipe = await getRecipeDetail(auth.householdId, id);
  if (!recipe) return errors.notFound("Recipe not found");
  return ok(recipe);
});

// PUT /api/v1/recipes/[id]
export const PUT = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  const input = await parseJson(req, recipeInputSchema);
  try {
    await updateRecipe(auth.householdId, id, input);
  } catch (err) {
    if (err instanceof RecipeCycleError) return errors.conflict(err.message);
    if (err instanceof Error && err.message === "not_found")
      return errors.notFound("Recipe not found");
    throw err;
  }
  const recipe = await getRecipeDetail(auth.householdId, id);
  return ok(recipe);
});

// DELETE /api/v1/recipes/[id]
export const DELETE = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { id } = await ctx.params;
  const deleted = await deleteRecipe(auth.householdId, id);
  if (!deleted) return errors.notFound("Recipe not found");
  return ok({ ok: true });
});
