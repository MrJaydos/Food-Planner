import Link from "next/link";
import { requireContext } from "@/lib/guard";
import { listRecipes } from "@/lib/recipe-queries";
import { refreshLastUsed } from "@/lib/suggestions";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { formatTime, lastUsedLabel } from "@/lib/format";
import { RecipeSearch } from "./recipe-search";

export const dynamic = "force-dynamic";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireContext("/app/recipes");
  const { q } = await searchParams;
  await refreshLastUsed(ctx.household.id);
  const recipes = await listRecipes(ctx.household.id, { q });

  return (
    <>
      <PageHeader
        title="Recipes"
        action={
          <div className="flex gap-2">
            <Link href="/app/recipes/import" className="btn-secondary !px-3">
              Import
            </Link>
            <Link href="/app/recipes/new" className="btn-primary !px-3">
              + New
            </Link>
          </div>
        }
      />
      <div className="p-4">
        <RecipeSearch initialQuery={q ?? ""} />

        {recipes.length === 0 ? (
          <EmptyState
            title={q ? "No matching recipes" : "No recipes yet"}
            description={
              q
                ? "Try a different search."
                : "Add a recipe manually or import one from a website."
            }
            action={
              !q ? (
                <div className="flex gap-2">
                  <Link href="/app/recipes/new" className="btn-primary">
                    Add recipe
                  </Link>
                  <Link href="/app/recipes/import" className="btn-secondary">
                    Import from URL
                  </Link>
                </div>
              ) : null
            }
          />
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {recipes.map((r) => {
              const time = formatTime(
                (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0) || null,
              );
              return (
                <li key={r.id}>
                  <Link href={`/app/recipes/${r.id}`} className="card flex h-full gap-3 overflow-hidden p-0">
                    {r.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.imageUrl}
                        alt=""
                        className="h-24 w-24 shrink-0 object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center bg-brand-50 text-brand-300 dark:bg-brand-900/30">
                        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M4 4h13a3 3 0 013 3v13H7a3 3 0 01-3-3zM8 8h8M8 12h8M8 16h5" />
                        </svg>
                      </div>
                    )}
                    <div className="min-w-0 flex-1 py-3 pr-3">
                      <h2 className="truncate font-semibold">{r.title}</h2>
                      {r.description ? (
                        <p className="mt-0.5 line-clamp-1 text-sm text-black/55 dark:text-white/55">
                          {r.description}
                        </p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-black/45 dark:text-white/45">
                        {r.servings ? <span>{r.servings} servings</span> : null}
                        {time ? <span>· {time}</span> : null}
                        {r.componentCount > 0 ? (
                          <span>· {r.componentCount} sub-recipe{r.componentCount > 1 ? "s" : ""}</span>
                        ) : null}
                        {r.tags.slice(0, 2).map((t) => (
                          <span key={t} className="rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10">
                            {t}
                          </span>
                        ))}
                        <span className="text-black/35 dark:text-white/35">
                          · {lastUsedLabel(r.lastUsedAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
