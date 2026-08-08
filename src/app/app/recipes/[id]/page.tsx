import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContext } from "@/lib/guard";
import { getRecipeDetail } from "@/lib/recipe-queries";
import { formatQuantity, formatTime, MEAL_TYPE_LABELS } from "@/lib/format";
import { SubRecipeAccordion } from "./sub-recipe";
import { RecipeActions } from "./recipe-actions";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireContext("/app/recipes");
  const { id } = await params;
  const recipe = await getRecipeDetail(ctx.household.id, id);
  if (!recipe) notFound();

  const totalTime =
    (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0) || null;

  return (
    <div className="pb-6">
      {/* Hero */}
      {recipe.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.imageUrl}
          alt=""
          className="h-56 w-full object-cover"
        />
      ) : null}

      <div className="safe-top sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-black/5 bg-[var(--background)]/85 px-4 py-3 backdrop-blur dark:border-white/10">
        <Link href="/app/recipes" className="btn-ghost !px-2">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Recipes
        </Link>
        <RecipeActions recipeId={recipe.id} />
      </div>

      <div className="space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-semibold">{recipe.title}</h1>
          {recipe.description ? (
            <p className="mt-1.5 text-sm text-black/60 dark:text-white/60">
              {recipe.description}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-black/55 dark:text-white/55">
            {recipe.servings ? <Meta>{recipe.servings} servings</Meta> : null}
            {formatTime(recipe.prepTimeMinutes) ? (
              <Meta>Prep {formatTime(recipe.prepTimeMinutes)}</Meta>
            ) : null}
            {formatTime(recipe.cookTimeMinutes) ? (
              <Meta>Cook {formatTime(recipe.cookTimeMinutes)}</Meta>
            ) : null}
            {!recipe.prepTimeMinutes && !recipe.cookTimeMinutes && totalTime ? (
              <Meta>{formatTime(totalTime)}</Meta>
            ) : null}
          </div>
          {(recipe.suitableFor.length > 0 || recipe.tags.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {recipe.suitableFor.map((m) => (
                <span key={m} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  {MEAL_TYPE_LABELS[m]}
                </span>
              ))}
              {recipe.tags.map((t) => (
                <span key={t} className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs text-black/60 dark:bg-white/10 dark:text-white/60">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Ingredients */}
        {(recipe.ingredients.length > 0 || recipe.components.length > 0) && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">Ingredients</h2>
            <ul className="card divide-y divide-black/5 dark:divide-white/10">
              {recipe.ingredients.map((ing) => (
                <li key={ing.id} className="flex items-baseline gap-3 px-4 py-2.5">
                  <span className="min-w-[64px] shrink-0 text-sm font-medium text-brand-700 dark:text-brand-300">
                    {formatQuantity(ing.quantity, ing.unit) || "—"}
                  </span>
                  <span className="text-sm">
                    {ing.name}
                    {ing.note ? (
                      <span className="text-black/45 dark:text-white/45">
                        {" "}
                        · {ing.note}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
              {recipe.components.map((c) => (
                <SubRecipeAccordion key={c.id} component={c} />
              ))}
            </ul>
          </section>
        )}

        {/* Steps */}
        {recipe.steps.length > 0 && (
          <section>
            <h2 className="mb-2 text-lg font-semibold">Method</h2>
            <ol className="space-y-3">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {recipe.sourceUrl ? (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm text-brand-600 underline dark:text-brand-300"
          >
            View original source
          </a>
        ) : null}
      </div>
    </div>
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-lg bg-black/5 px-2.5 py-1 dark:bg-white/10">
      {children}
    </span>
  );
}
