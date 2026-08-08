import type { IngredientCategory, MealType } from "@prisma/client";
import { prisma } from "./prisma";
import { dateOnly } from "./week";
import {
  createRecipeCache,
  primeRecipeCache,
  expandToIngredientSet,
  collectRecipeIds,
} from "./recipe-expand";

/**
 * Shared-ingredient "week shaping": given the recipes already planned for a
 * week, suggest others that reuse the same fresh ingredients — the
 * "this uses the rest of the coriander" case — to cut waste and shopping
 * volume. This is what the normalized Ingredient table was built for.
 */

/**
 * How much a shared ingredient counts towards a suggestion.
 *
 * Staples are deliberately zero: nearly every recipe shares salt, oil and
 * pepper, so counting them would rank on recipe length rather than on anything
 * useful. The signal we want is perishables that would otherwise be wasted, so
 * fresh produce dominates and freezer items barely register.
 */
const OVERLAP_WEIGHTS: Record<IngredientCategory, number> = {
  PRODUCE: 3, // herbs and veg — the classic half-used bunch
  MEAT_SEAFOOD: 2,
  DAIRY_EGGS: 2,
  BAKERY: 1.5,
  FROZEN: 0.5, // keeps, so reusing it saves little
  PANTRY: 0,
  SPICES: 0,
  CONDIMENTS: 0,
  BEVERAGES: 0,
  HOUSEHOLD: 0,
  OTHER: 0,
};

export interface OverlapSuggestion {
  id: string;
  title: string;
  imageUrl: string | null;
  suitableFor: MealType[];
  lastUsedAt: string | null;
  /** Perishable ingredients this shares with the week, best-first. */
  sharedIngredients: string[];
  /** Human-readable reason, e.g. "Also uses coriander and lime". */
  reason: string;
  score: number;
}

function buildReason(names: string[]): string {
  const shown = names.slice(0, 3);
  if (shown.length === 1) return `Also uses ${shown[0]}`;
  if (shown.length === 2) return `Also uses ${shown[0]} and ${shown[1]}`;
  return `Also uses ${shown[0]}, ${shown[1]} and ${shown[2]}`;
}

export async function suggestOverlapping(
  householdId: string,
  weekStart: string,
  opts: { mealType?: MealType; limit?: number; excludeId?: string } = {},
): Promise<OverlapSuggestion[]> {
  const limit = opts.limit ?? 6;

  const plan = await prisma.mealPlan.findUnique({
    where: {
      householdId_weekStart: { householdId, weekStart: dateOnly(weekStart) },
    },
    include: {
      slots: {
        include: {
          entries: {
            where: { kind: "RECIPE", recipeId: { not: null } },
            select: { recipeId: true },
          },
        },
      },
    },
  });

  const plannedIds = new Set<string>();
  for (const slot of plan?.slots ?? []) {
    for (const entry of slot.entries) {
      if (entry.recipeId) plannedIds.add(entry.recipeId);
    }
  }
  // Nothing planned yet means nothing to build on.
  if (plannedIds.size === 0) return [];

  const cache = createRecipeCache();
  await primeRecipeCache(householdId, cache);

  // Everything the plan already implies cooking — planned recipes plus their
  // sub-recipes. Suggesting the chimichurri that's already inside this week's
  // steak tacos would be nonsense, so these are never candidates.
  const alreadyCooking = new Set<string>();
  for (const recipeId of plannedIds) {
    await collectRecipeIds(recipeId, cache, alreadyCooking);
  }

  // Union of the perishable ingredients the week already commits us to buying.
  const planned = new Map<string, { name: string; weight: number }>();
  for (const recipeId of plannedIds) {
    const set = await expandToIngredientSet(recipeId, cache);
    for (const [ingredientId, info] of set) {
      const weight = OVERLAP_WEIGHTS[info.category];
      if (weight > 0) planned.set(ingredientId, { name: info.name, weight });
    }
  }
  if (planned.size === 0) return [];

  const candidates = await prisma.recipe.findMany({
    where: {
      householdId,
      id: {
        notIn: [
          ...alreadyCooking,
          ...(opts.excludeId ? [opts.excludeId] : []),
        ],
      },
      ...(opts.mealType ? { suitableFor: { has: opts.mealType } } : {}),
    },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      suitableFor: true,
      lastUsedAt: true,
    },
  });

  const scored: OverlapSuggestion[] = [];
  for (const recipe of candidates) {
    const set = await expandToIngredientSet(recipe.id, cache);

    const shared: Array<{ name: string; weight: number }> = [];
    let score = 0;
    for (const ingredientId of set.keys()) {
      const hit = planned.get(ingredientId);
      if (hit) {
        shared.push(hit);
        score += hit.weight;
      }
    }
    if (score === 0) continue;

    // Name the most valuable overlaps first, so the reason leads with produce.
    shared.sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name));
    const names = shared.map((s) => s.name);

    scored.push({
      id: recipe.id,
      title: recipe.title,
      imageUrl: recipe.imageUrl,
      suitableFor: recipe.suitableFor,
      lastUsedAt: recipe.lastUsedAt ? recipe.lastUsedAt.toISOString() : null,
      sharedIngredients: names,
      reason: buildReason(names),
      score,
    });
  }

  // Best overlap first; break ties towards recipes not cooked in a while.
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.lastUsedAt === b.lastUsedAt) return a.title.localeCompare(b.title);
    if (a.lastUsedAt === null) return -1;
    if (b.lastUsedAt === null) return 1;
    return a.lastUsedAt.localeCompare(b.lastUsedAt);
  });

  return scored.slice(0, limit);
}
