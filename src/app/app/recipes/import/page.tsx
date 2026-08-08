import Link from "next/link";
import { requireContext } from "@/lib/guard";
import { ImportClient } from "./import-client";

export const dynamic = "force-dynamic";

export default async function ImportRecipePage({
  searchParams,
}: {
  // Pre-filled when arriving from an idea that had a link jotted with it.
  searchParams: Promise<{ url?: string; fromIdea?: string }>;
}) {
  await requireContext("/app/recipes/import");
  const { url, fromIdea } = await searchParams;

  return (
    <>
      <div className="safe-top sticky top-0 z-20 flex items-center gap-2 border-b border-black/5 bg-[var(--background)]/85 px-4 py-3 backdrop-blur dark:border-white/10">
        <Link href={fromIdea ? "/app/ideas" : "/app/recipes"} className="btn-ghost !px-2">
          Cancel
        </Link>
        <h1 className="text-lg font-semibold">Import recipe</h1>
      </div>
      <ImportClient initialUrl={url} fromIdeaId={fromIdea} />
    </>
  );
}
