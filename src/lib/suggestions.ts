import type { MealType } from "@prisma/client";
import { prisma } from "./prisma";
import { currentWeekStart, dateOnly } from "./week";

/**
 * Recompute lastUsedAt for a household's recipes based on the most recent PAST
 * week (weekStart before the current week) they were planned in as a recipe
 * entry. Cheap enough to run opportunistically before showing suggestions.
 */
export async function refreshLastUsed(householdId: string): Promise<void> {
  const cutoff = dateOnly(currentWeekStart()); // start of this week

  const entries = await prisma.mealSlotEntry.findMany({
    where: {
      kind: "RECIPE",
      recipeId: { not: null },
      slot: { mealPlan: { householdId, weekStart: { lt: cutoff } } },
    },
    select: {
      recipeId: true,
      slot: { select: { mealPlan: { select: { weekStart: true } } } },
    },
  });

  // Latest past-week date per recipe.
  const latest = new Map<string, Date>();
  for (const e of entries) {
    if (!e.recipeId) continue;
    const wk = e.slot.mealPlan.weekStart;
    const cur = latest.get(e.recipeId);
    if (!cur || wk > cur) latest.set(e.recipeId, wk);
  }
  if (latest.size === 0) return;

  // Only write when the value actually changes.
  const recipes = await prisma.recipe.findMany({
    where: { id: { in: [...latest.keys()] }, householdId },
    select: { id: true, lastUsedAt: true },
  });
  await Promise.all(
    recipes.map((r) => {
      const wk = latest.get(r.id)!;
      if (r.lastUsedAt && r.lastUsedAt.getTime() === wk.getTime())
        return Promise.resolve();
      return prisma.recipe.update({
        where: { id: r.id },
        data: { lastUsedAt: wk },
      });
    }),
  );
}

/** Weight favouring recipes not used recently (never used = highest). */
function weightFor(lastUsedAt: Date | null): number {
  if (!lastUsedAt) return 8;
  const weeks = Math.floor(
    (Date.now() - lastUsedAt.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );
  return Math.min(8, Math.max(1, weeks));
}

export interface SurpriseResult {
  id: string;
  title: string;
  imageUrl: string | null;
  lastUsedAt: string | null;
  suitableFor: MealType[];
}

/**
 * Pick a random recipe weighted toward those not used recently, preferring ones
 * tagged for the given meal type. `excludeId` supports one-tap re-roll.
 */
export async function surprisePick(
  householdId: string,
  opts: { mealType?: MealType; excludeId?: string } = {},
): Promise<SurpriseResult | null> {
  await refreshLastUsed(householdId);

  const all = await prisma.recipe.findMany({
    where: {
      householdId,
      id: opts.excludeId ? { not: opts.excludeId } : undefined,
    },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      lastUsedAt: true,
      suitableFor: true,
    },
  });
  if (all.length === 0) return null;

  // Prefer meal-type matches; fall back to all if none are tagged for it.
  let candidates = all;
  if (opts.mealType) {
    const matches = all.filter((r) => r.suitableFor.includes(opts.mealType!));
    if (matches.length > 0) candidates = matches;
  }

  const weights = candidates.map((r) => weightFor(r.lastUsedAt));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  let chosen = candidates[0];
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      chosen = candidates[i];
      break;
    }
  }

  return {
    id: chosen.id,
    title: chosen.title,
    imageUrl: chosen.imageUrl,
    lastUsedAt: chosen.lastUsedAt?.toISOString() ?? null,
    suitableFor: chosen.suitableFor,
  };
}
