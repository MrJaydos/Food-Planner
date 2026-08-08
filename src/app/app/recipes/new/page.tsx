import Link from "next/link";
import { requireContext } from "@/lib/guard";
import { RecipeEditor } from "@/components/recipe-editor";

export const dynamic = "force-dynamic";

export default async function NewRecipePage({
  searchParams,
}: {
  // Set when arriving from a jotted idea, which pre-fills the basics and gets
  // ticked off once the recipe saves.
  searchParams: Promise<{
    title?: string;
    description?: string;
    fromIdea?: string;
  }>;
}) {
  await requireContext("/app/recipes/new");
  const { title, description, fromIdea } = await searchParams;

  return (
    <>
      <div className="safe-top sticky top-0 z-20 flex items-center gap-2 border-b border-black/5 bg-[var(--background)]/85 px-4 py-3 backdrop-blur dark:border-white/10">
        <Link href={fromIdea ? "/app/ideas" : "/app/recipes"} className="btn-ghost !px-2">
          Cancel
        </Link>
        <h1 className="text-lg font-semibold">New recipe</h1>
      </div>
      <RecipeEditor
        mode="create"
        initial={title || description ? { title, description } : undefined}
        fromIdeaId={fromIdea}
      />
    </>
  );
}
