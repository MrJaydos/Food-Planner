import type { IngredientCategory } from "@prisma/client";
import { prisma } from "./prisma";
import { dateOnly } from "./week";
import { toMergeKey, formatMetric, tidyNumber } from "./units";
import { CATEGORY_ORDER } from "./format";

// --- Recipe expansion -----------------------------------------------------

interface RecipeData {
  ingredients: Array<{
    ingredientId: string;
    name: string;
    category: IngredientCategory;
    quantity: number | null;
    unit: string | null;
  }>;
  components: Array<{ childRecipeId: string; quantityMultiplier: number }>;
}

interface ExpandedUsage {
  ingredientId: string;
  name: string;
  category: IngredientCategory;
  quantity: number | null;
  unit: string | null;
}

async function loadRecipe(
  recipeId: string,
  cache: Map<string, RecipeData>,
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
async function expandRecipe(
  recipeId: string,
  multiplier: number,
  cache: Map<string, RecipeData>,
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

// --- Aggregation ----------------------------------------------------------

interface Aggregate {
  ingredientId: string;
  name: string;
  category: IngredientCategory;
  mergeKey: string;
  dimension: ReturnType<typeof toMergeKey>["dimension"];
  displayUnit: string | null;
  sumBase: number;
  hasQuantity: boolean;
  hasUnspecified: boolean;
}

function aggregate(usages: ExpandedUsage[]): Aggregate[] {
  const map = new Map<string, Aggregate>();
  for (const u of usages) {
    const mk = toMergeKey(u.unit, u.quantity);
    const key = `${u.ingredientId}::${mk.key}`;
    let agg = map.get(key);
    if (!agg) {
      agg = {
        ingredientId: u.ingredientId,
        name: u.name,
        category: u.category,
        mergeKey: mk.key,
        dimension: mk.dimension,
        displayUnit: mk.key.startsWith("dim:") ? null : u.unit ?? null,
        sumBase: 0,
        hasQuantity: false,
        hasUnspecified: false,
      };
      map.set(key, agg);
    }
    if (u.quantity == null || mk.baseQuantity == null) {
      agg.hasUnspecified = true;
    } else {
      agg.sumBase += mk.baseQuantity;
      agg.hasQuantity = true;
    }
  }
  return [...map.values()];
}

interface GeneratedItem {
  ingredientId: string;
  displayName: string;
  quantity: number | null;
  unit: string | null;
  category: IngredientCategory;
  note: string | null;
}

function toGeneratedItem(agg: Aggregate): GeneratedItem {
  let quantity: number | null = null;
  let unit: string | null = agg.displayUnit;

  if (agg.hasQuantity) {
    if (agg.mergeKey.startsWith("dim:")) {
      const f = formatMetric(agg.dimension, agg.sumBase);
      quantity = tidyNumber(f.quantity);
      unit = f.unit || null;
    } else {
      quantity = tidyNumber(agg.sumBase);
    }
  }

  const note =
    agg.hasUnspecified && agg.hasQuantity ? "plus some unspecified" : null;

  return {
    ingredientId: agg.ingredientId,
    displayName: agg.name,
    quantity,
    unit,
    category: agg.category,
    note,
  };
}

// --- Generation + persistence --------------------------------------------

/** Stable key for preserving checked state across regenerations. */
function preserveKey(
  ingredientId: string | null,
  displayName: string,
  unit: string | null,
  quantity: number | null,
): string {
  const base = ingredientId ?? `name:${displayName.toLowerCase()}`;
  return `${base}::${toMergeKey(unit, quantity).key}`;
}

export async function generateShoppingList(
  householdId: string,
  weekStart: string,
): Promise<string | null> {
  const plan = await prisma.mealPlan.findUnique({
    where: { householdId_weekStart: { householdId, weekStart: dateOnly(weekStart) } },
    include: {
      slots: {
        include: {
          entries: {
            where: { kind: "RECIPE", recipeId: { not: null } },
            select: { recipeId: true, servingMultiplier: true },
          },
        },
      },
    },
  });
  if (!plan) return null;

  // Expand every recipe entry (skips CUSTOM and EATING_OUT by the where clause).
  const cache = new Map<string, RecipeData>();
  const usages: ExpandedUsage[] = [];
  for (const slot of plan.slots) {
    for (const entry of slot.entries) {
      if (!entry.recipeId) continue;
      await expandRecipe(
        entry.recipeId,
        entry.servingMultiplier,
        cache,
        new Set(),
        usages,
      );
    }
  }

  const generated = aggregate(usages).map(toGeneratedItem);

  // Sort by store-walk category order then name.
  generated.sort((a, b) => {
    const ca = CATEGORY_ORDER.indexOf(a.category);
    const cb = CATEGORY_ORDER.indexOf(b.category);
    return ca - cb || a.displayName.localeCompare(b.displayName);
  });

  await prisma.$transaction(async (tx) => {
    const list = await tx.shoppingList.upsert({
      where: { mealPlanId: plan.id },
      create: { householdId, mealPlanId: plan.id },
      update: { generatedAt: new Date() },
    });

    // Preserve checked state of previously-generated items and keep manual ones.
    const existing = await tx.shoppingListItem.findMany({
      where: { shoppingListId: list.id },
    });
    const checkedByKey = new Map<string, boolean>();
    for (const item of existing) {
      if (item.isManual) continue;
      checkedByKey.set(
        preserveKey(item.ingredientId, item.displayName, item.unit, item.quantity),
        item.checked,
      );
    }

    // Replace generated (non-manual) items; keep manual items untouched.
    await tx.shoppingListItem.deleteMany({
      where: { shoppingListId: list.id, isManual: false },
    });

    let sort = 0;
    for (const g of generated) {
      const key = preserveKey(g.ingredientId, g.displayName, g.unit, g.quantity);
      await tx.shoppingListItem.create({
        data: {
          shoppingListId: list.id,
          ingredientId: g.ingredientId,
          displayName: g.displayName,
          quantity: g.quantity,
          unit: g.unit,
          category: g.category,
          note: g.note,
          checked: checkedByKey.get(key) ?? false,
          isManual: false,
          sortOrder: sort++,
        },
      });
    }
  });

  const list = await prisma.shoppingList.findUnique({
    where: { mealPlanId: plan.id },
    select: { id: true },
  });
  return list?.id ?? null;
}
