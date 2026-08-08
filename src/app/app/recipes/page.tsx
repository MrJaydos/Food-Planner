import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default function RecipesPlaceholder() {
  return (
    <>
      <PageHeader title="Recipes" />
      <EmptyState
        title="Recipes coming soon"
        description="Custom recipes, structured ingredients, sub-recipes and URL import arrive in the recipes phase."
      />
    </>
  );
}
