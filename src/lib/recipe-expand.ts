import type { IngredientCategory } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Recursive sub-recipe expansion, shared by shopping-list generation and the
 * shared-ingredient suggestions. Kept in one place so both use the same cycle
 * guard and the same notion of what a recipe expands to.
 */

export interface RecipeData {
  ingredients: Array<{
    ingredientId: string;
    name: string;
    category: IngredientCategory;
    quantity: number | null;
    unit: string | null;
  }>;
  components: Array<{ childRecipeId: string; quantityMultiplier: number }>;
}

export interface ExpandedUsage {
  ingredientId: string;
  name: string;
  category: IngredientCategory;
  quantity: number | null;
  unit: string | null;
}

export type RecipeCache = Map<string, RecipeData>;

export function createRecipeCache(): RecipeCache {
  return new Map();
}

/**
 * Load every recipe in a household into the cache in one query.
 *
 * Scoring a whole library one recipe at a time would be a query per recipe;
 * priming up front keeps expansion purely in memory.
 */
export async function primeRecipeCache(
  householdId: string,
  cache: RecipeCache,
): Promise<void> {
  const recipes = await prisma.recipe.findMany({
    where: { householdId },
    include: {
      ingredients: { include: { ingredient: true }, orderBy: { sortOrder: "asc" } },
      components: true,
    },
  });
  for (const recipe of recipes) {
    cache.set(recipe.id, {
      ingredients: recipe.ingredients.map((ri) => ({
        ingredientId: ri.ingredientId,
        name: ri.ingredient.name,
        category: ri.ingredient.category,
        quantity: ri.quantity,
        unit: ri.unit,
      })),
      components: recipe.components.map((c) => ({
        childRecipeId: c.childRecipeId,
        quantityMultiplier: c.quantityMultiplier,
      })),
    });
  }
}

export async function loadRecipe(
  recipeId: string,
  cache: RecipeCache,
): Promise<RecipeData> {
  const cached = cache.get(recipeId);
  if (cached) return cached;
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: { include: { ingredient: true }, orderBy: { sortOrder: "asc" } },
      components: true,
    },
  });
  const data: RecipeData = {
    ingredients:
      recipe?.ingredients.map((ri) => ({
        ingredientId: ri.ingredientId,
        name: ri.ingredient.name,
        category: ri.ingredient.category,
        quantity: ri.quantity,
        unit: ri.unit,
      })) ?? [],
    components:
      recipe?.components.map((c) => ({
        childRecipeId: c.childRecipeId,
        quantityMultiplier: c.quantityMultiplier,
      })) ?? [],
  };
  cache.set(recipeId, data);
  return data;
}

/**
 * Recursively expand a recipe into base ingredient usages, applying the
 * multiplier at each level. `path` guards against cycles (already blocked on
 * save, but defensive here).
 */
export async function expandRecipe(
  recipeId: string,
  multiplier: number,
  cache: RecipeCache,
  path: Set<string>,
  out: ExpandedUsage[],
): Promise<void> {
  if (path.has(recipeId)) return; // cycle guard
  path.add(recipeId);
  const data = await loadRecipe(recipeId, cache);

  for (const ing of data.ingredients) {
    out.push({
      ingredientId: ing.ingredientId,
      name: ing.name,
      category: ing.category,
      quantity: ing.quantity == null ? null : ing.quantity * multiplier,
      unit: ing.unit,
    });
  }
  for (const comp of data.components) {
    await expandRecipe(
      comp.childRecipeId,
      multiplier * comp.quantityMultiplier,
      cache,
      path,
      out,
    );
  }

  path.delete(recipeId);
}

/**
 * Collect a recipe and every sub-recipe reachable from it, into `into`.
 *
 * Used to work out everything a plan already implies you're cooking: if steak
 * tacos are planned, the chimichurri inside them is being made too.
 */
export async function collectRecipeIds(
  recipeId: string,
  cache: RecipeCache,
  into: Set<string>,
): Promise<void> {
  if (into.has(recipeId)) return; // also guards cycles
  into.add(recipeId);
  const data = await loadRecipe(recipeId, cache);
  for (const comp of data.components) {
    await collectRecipeIds(comp.childRecipeId, cache, into);
  }
}

/**
 * The distinct base ingredients a recipe resolves to, sub-recipes included.
 * Quantities are irrelevant here — overlap is about "do these share an item".
 */
export async function expandToIngredientSet(
  recipeId: string,
  cache: RecipeCache,
): Promise<Map<string, { name: string; category: IngredientCategory }>> {
  const out: ExpandedUsage[] = [];
  await expandRecipe(recipeId, 1, cache, new Set(), out);
  const set = new Map<string, { name: string; category: IngredientCategory }>();
  for (const u of out) {
    if (!set.has(u.ingredientId)) {
      set.set(u.ingredientId, { name: u.name, category: u.category });
    }
  }
  return set;
}
