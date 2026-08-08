import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContext } from "@/lib/guard";
import { getRecipeDetail } from "@/lib/recipe-queries";
import { RecipeEditor, type RecipeEditorInitial } from "@/components/recipe-editor";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireContext("/app/recipes");
  const { id } = await params;
  const recipe = await getRecipeDetail(ctx.household.id, id);
  if (!recipe) notFound();

  const initial: RecipeEditorInitial = {
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    steps: recipe.steps,
    tags: recipe.tags,
    suitableFor: recipe.suitableFor,
    sourceUrl: recipe.sourceUrl,
    imageUrl: recipe.imageUrl,
    ingredients: recipe.ingredients.map((i) => ({
      quantity: i.quantity,
      unit: i.unit,
      name: i.name,
      note: i.note,
    })),
    components: recipe.components.map((c) => ({
      childRecipeId: c.child.id,
      title: c.child.title,
      quantityMultiplier: c.quantityMultiplier,
      note: c.note,
    })),
  };

  return (
    <>
      <div className="safe-top sticky top-0 z-20 flex items-center gap-2 border-b border-black/5 bg-[var(--background)]/85 px-4 py-3 backdrop-blur dark:border-white/10">
        <Link href={`/app/recipes/${id}`} className="btn-ghost !px-2">
          Cancel
        </Link>
        <h1 className="text-lg font-semibold">Edit recipe</h1>
      </div>
      <RecipeEditor mode="edit" recipeId={id} initial={initial} />
    </>
  );
}
