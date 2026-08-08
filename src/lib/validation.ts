import { z } from "zod";

export const mealTypeEnum = z.enum(["BREAKFAST", "LUNCH", "DINNER"]);

export const recipeIngredientInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().trim().max(40).nullable().optional(),
  note: z.string().trim().max(300).nullable().optional(),
  rawText: z.string().trim().max(400).nullable().optional(),
});

export const recipeComponentInputSchema = z.object({
  childRecipeId: z.string().min(1),
  quantityMultiplier: z.number().positive().max(1000).optional(),
  note: z.string().trim().max(300).nullable().optional(),
});

export const recipeInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).nullable().optional(),
  servings: z.number().int().positive().max(100).nullable().optional(),
  prepTimeMinutes: z.number().int().min(0).max(100000).nullable().optional(),
  cookTimeMinutes: z.number().int().min(0).max(100000).nullable().optional(),
  steps: z.array(z.string().max(4000)).max(200).optional(),
  tags: z.array(z.string().trim().max(40)).max(50).optional(),
  suitableFor: z.array(mealTypeEnum).max(3).optional(),
  sourceUrl: z.string().trim().url().max(2000).nullable().optional(),
  imageUrl: z.string().trim().max(2000).nullable().optional(),
  ingredients: z.array(recipeIngredientInputSchema).max(200).optional(),
  components: z.array(recipeComponentInputSchema).max(50).optional(),
});

export type RecipeInputSchema = z.infer<typeof recipeInputSchema>;
