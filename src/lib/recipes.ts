import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import {
  normalizeIngredientName,
  categorizeIngredient,
} from "./ingredient-normalize";
import { normalizeUnit } from "./units";

type Tx = Prisma.TransactionClient | PrismaClient;

// --- Ingredient upsert ----------------------------------------------------

/** Find or create the normalized Ingredient for a raw name within a household. */
export async function upsertIngredient(
  tx: Tx,
  householdId: string,
  rawName: string,
): Promise<string> {
  const { key, display } = normalizeIngredientName(rawName);
  const existing = await tx.ingredient.findUnique({
    where: { householdId_normalizedKey: { householdId, normalizedKey: key } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await tx.ingredient.create({
    data: {
      householdId,
      name: display,
      normalizedKey: key,
      category: categorizeIngredient(key),
    },
    select: { id: true },
  });
  return created.id;
}

// --- Recipe input shapes --------------------------------------------------

export interface RecipeIngredientInput {
  quantity?: number | null;
  unit?: string | null;
  name: string;
  note?: string | null;
  rawText?: string | null;
}

export interface RecipeComponentInput {
  childRecipeId: string;
  quantityMultiplier?: number;
  note?: string | null;
}

export interface RecipeInput {
  title: string;
  description?: string | null;
  servings?: number | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  steps?: string[];
  tags?: string[];
  suitableFor?: Array<"BREAKFAST" | "LUNCH" | "DINNER">;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  ingredients?: RecipeIngredientInput[];
  components?: RecipeComponentInput[];
}

// --- Cycle detection ------------------------------------------------------

export class RecipeCycleError extends Error {
  constructor(message = "This would create a circular sub-recipe reference.") {
    super(message);
    this.name = "RecipeCycleError";
  }
}

/**
 * Ensure adding edges recipeId -> childIds introduces no cycle in the
 * household's sub-recipe graph. Throws RecipeCycleError if it would.
 */
export async function assertNoCycle(
  tx: Tx,
  householdId: string,
  recipeId: string | null,
  childIds: string[],
): Promise<void> {
  if (childIds.length === 0) return;

  // Self reference.
  if (recipeId && childIds.includes(recipeId)) throw new RecipeCycleError();

  // Load the whole household component graph (child -> its children).
  const edges = await tx.recipeComponent.findMany({
    where: { parent: { householdId } },
    select: { parentRecipeId: true, childRecipeId: true },
  });
  const childrenOf = new Map<string, string[]>();
  for (const e of edges) {
    const arr = childrenOf.get(e.parentRecipeId) ?? [];
    arr.push(e.childRecipeId);
    childrenOf.set(e.parentRecipeId, arr);
  }

  // If recipeId is reachable from any proposed child, we'd form a cycle.
  const target = recipeId;
  if (!target) return; // brand-new recipe: it has no id yet, can't be reached
  for (const start of childIds) {
    const seen = new Set<string>();
    const stack = [start];
    while (stack.length) {
      const node = stack.pop()!;
      if (node === target) throw new RecipeCycleError();
      if (seen.has(node)) continue;
      seen.add(node);
      for (const next of childrenOf.get(node) ?? []) stack.push(next);
    }
  }
}

// --- Create / update ------------------------------------------------------

function normalizeIngredientRows(
  ingredients: RecipeIngredientInput[] | undefined,
) {
  return (ingredients ?? [])
    .filter((i) => i.name && i.name.trim())
    .map((i, idx) => ({
      quantity: i.quantity ?? null,
      unit: i.unit ? normalizeUnit(i.unit) : null,
      note: i.note?.trim() || null,
      rawText: i.rawText?.trim() || null,
      name: i.name.trim(),
      sortOrder: idx,
    }));
}

async function validateComponentChildren(
  tx: Tx,
  householdId: string,
  components: RecipeComponentInput[] | undefined,
): Promise<RecipeComponentInput[]> {
  const list = (components ?? []).filter((c) => c.childRecipeId);
  if (list.length === 0) return [];
  const ids = [...new Set(list.map((c) => c.childRecipeId))];
  const found = await tx.recipe.findMany({
    where: { id: { in: ids }, householdId },
    select: { id: true },
  });
  const valid = new Set(found.map((r) => r.id));
  return list.filter((c) => valid.has(c.childRecipeId));
}

export async function createRecipe(
  householdId: string,
  input: RecipeInput,
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const components = await validateComponentChildren(
      tx,
      householdId,
      input.components,
    );
    await assertNoCycle(
      tx,
      householdId,
      null,
      components.map((c) => c.childRecipeId),
    );

    const recipe = await tx.recipe.create({
      data: {
        householdId,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        servings: input.servings ?? null,
        prepTimeMinutes: input.prepTimeMinutes ?? null,
        cookTimeMinutes: input.cookTimeMinutes ?? null,
        steps: cleanSteps(input.steps),
        tags: cleanTags(input.tags),
        suitableFor: input.suitableFor ?? [],
        sourceUrl: input.sourceUrl?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
      },
      select: { id: true },
    });

    await writeIngredients(tx, householdId, recipe.id, input.ingredients);
    await writeComponents(tx, recipe.id, components);
    return recipe.id;
  });
}

export async function updateRecipe(
  householdId: string,
  recipeId: string,
  input: RecipeInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const owned = await tx.recipe.findFirst({
      where: { id: recipeId, householdId },
      select: { id: true },
    });
    if (!owned) throw new Error("not_found");

    const components = await validateComponentChildren(
      tx,
      householdId,
      input.components,
    );
    await assertNoCycle(
      tx,
      householdId,
      recipeId,
      components.map((c) => c.childRecipeId),
    );

    await tx.recipe.update({
      where: { id: recipeId },
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        servings: input.servings ?? null,
        prepTimeMinutes: input.prepTimeMinutes ?? null,
        cookTimeMinutes: input.cookTimeMinutes ?? null,
        steps: cleanSteps(input.steps),
        tags: cleanTags(input.tags),
        suitableFor: input.suitableFor ?? [],
        sourceUrl: input.sourceUrl?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
      },
    });

    // Replace ingredients and components wholesale (simplest correct approach).
    await tx.recipeIngredient.deleteMany({ where: { recipeId } });
    await tx.recipeComponent.deleteMany({ where: { parentRecipeId: recipeId } });
    await writeIngredients(tx, householdId, recipeId, input.ingredients);
    await writeComponents(tx, recipeId, components);
  });
}

async function writeIngredients(
  tx: Tx,
  householdId: string,
  recipeId: string,
  ingredients: RecipeIngredientInput[] | undefined,
): Promise<void> {
  const rows = normalizeIngredientRows(ingredients);
  for (const row of rows) {
    const ingredientId = await upsertIngredient(tx, householdId, row.name);
    await tx.recipeIngredient.create({
      data: {
        recipeId,
        ingredientId,
        quantity: row.quantity,
        unit: row.unit,
        note: row.note,
        rawText: row.rawText ?? row.name,
        sortOrder: row.sortOrder,
      },
    });
  }
}

async function writeComponents(
  tx: Tx,
  recipeId: string,
  components: RecipeComponentInput[],
): Promise<void> {
  let sort = 0;
  for (const c of components) {
    await tx.recipeComponent.create({
      data: {
        parentRecipeId: recipeId,
        childRecipeId: c.childRecipeId,
        quantityMultiplier: c.quantityMultiplier ?? 1,
        note: c.note?.trim() || null,
        sortOrder: sort++,
      },
    });
  }
}

function cleanSteps(steps: string[] | undefined): string[] {
  return (steps ?? []).map((s) => s.trim()).filter(Boolean);
}

function cleanTags(tags: string[] | undefined): string[] {
  return [
    ...new Set((tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)),
  ];
}

export async function deleteRecipe(
  householdId: string,
  recipeId: string,
): Promise<boolean> {
  const res = await prisma.recipe.deleteMany({
    where: { id: recipeId, householdId },
  });
  return res.count > 0;
}
