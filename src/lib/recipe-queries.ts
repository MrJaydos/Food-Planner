import type { IngredientCategory, MealType, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export interface RecipeListItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  tags: string[];
  suitableFor: MealType[];
  lastUsedAt: string | null;
  ingredientCount: number;
  componentCount: number;
}

export interface RecipeIngredientDTO {
  id: string;
  ingredientId: string;
  name: string;
  category: IngredientCategory;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  rawText: string | null;
}

export interface RecipeComponentChildDTO {
  id: string;
  title: string;
  imageUrl: string | null;
  ingredients: RecipeIngredientDTO[];
  steps: string[];
}

export interface RecipeComponentDTO {
  id: string;
  quantityMultiplier: number;
  note: string | null;
  child: RecipeComponentChildDTO;
}

export interface RecipeDetail {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  steps: string[];
  tags: string[];
  suitableFor: MealType[];
  lastUsedAt: string | null;
  ingredients: RecipeIngredientDTO[];
  components: RecipeComponentDTO[];
}

export async function listRecipes(
  householdId: string,
  opts: { q?: string; tag?: string; mealType?: MealType } = {},
): Promise<RecipeListItem[]> {
  const where: Prisma.RecipeWhereInput = { householdId };
  if (opts.q) where.title = { contains: opts.q, mode: "insensitive" };
  if (opts.tag) where.tags = { has: opts.tag.toLowerCase() };
  if (opts.mealType) where.suitableFor = { has: opts.mealType };

  const recipes = await prisma.recipe.findMany({
    where,
    orderBy: { title: "asc" },
    include: {
      _count: { select: { ingredients: true, components: true } },
    },
  });

  return recipes.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    imageUrl: r.imageUrl,
    servings: r.servings,
    prepTimeMinutes: r.prepTimeMinutes,
    cookTimeMinutes: r.cookTimeMinutes,
    tags: r.tags,
    suitableFor: r.suitableFor,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    ingredientCount: r._count.ingredients,
    componentCount: r._count.components,
  }));
}

const ingredientInclude = {
  ingredient: { select: { id: true, name: true, category: true } },
} satisfies Prisma.RecipeIngredientInclude;

function mapIngredient(ri: {
  id: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  rawText: string | null;
  ingredient: { id: string; name: string; category: IngredientCategory };
}): RecipeIngredientDTO {
  return {
    id: ri.id,
    ingredientId: ri.ingredient.id,
    name: ri.ingredient.name,
    category: ri.ingredient.category,
    quantity: ri.quantity,
    unit: ri.unit,
    note: ri.note,
    rawText: ri.rawText,
  };
}

export async function getRecipeDetail(
  householdId: string,
  recipeId: string,
): Promise<RecipeDetail | null> {
  const r = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId },
    include: {
      ingredients: {
        orderBy: { sortOrder: "asc" },
        include: ingredientInclude,
      },
      components: {
        orderBy: { sortOrder: "asc" },
        include: {
          child: {
            include: {
              ingredients: {
                orderBy: { sortOrder: "asc" },
                include: ingredientInclude,
              },
            },
          },
        },
      },
    },
  });
  if (!r) return null;

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    imageUrl: r.imageUrl,
    sourceUrl: r.sourceUrl,
    servings: r.servings,
    prepTimeMinutes: r.prepTimeMinutes,
    cookTimeMinutes: r.cookTimeMinutes,
    steps: r.steps,
    tags: r.tags,
    suitableFor: r.suitableFor,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    ingredients: r.ingredients.map(mapIngredient),
    components: r.components.map((c) => ({
      id: c.id,
      quantityMultiplier: c.quantityMultiplier,
      note: c.note,
      child: {
        id: c.child.id,
        title: c.child.title,
        imageUrl: c.child.imageUrl,
        steps: c.child.steps,
        ingredients: c.child.ingredients.map(mapIngredient),
      },
    })),
  };
}

/** Lightweight recipe search for the sub-recipe picker. */
export async function searchRecipesForPicker(
  householdId: string,
  q: string,
  excludeId?: string,
): Promise<Array<{ id: string; title: string }>> {
  const recipes = await prisma.recipe.findMany({
    where: {
      householdId,
      id: excludeId ? { not: excludeId } : undefined,
      title: q ? { contains: q, mode: "insensitive" } : undefined,
    },
    orderBy: { title: "asc" },
    take: 20,
    select: { id: true, title: true },
  });
  return recipes;
}
