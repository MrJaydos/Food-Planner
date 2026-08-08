import Link from "next/link";
import { requireContext } from "@/lib/guard";
import { ImportClient } from "./import-client";

export const dynamic = "force-dynamic";

export default async function ImportRecipePage() {
  await requireContext("/app/recipes/import");
  return (
    <>
      <div className="safe-top sticky top-0 z-20 flex items-center gap-2 border-b border-black/5 bg-[var(--background)]/85 px-4 py-3 backdrop-blur dark:border-white/10">
        <Link href="/app/recipes" className="btn-ghost !px-2">
          Cancel
        </Link>
        <h1 className="text-lg font-semibold">Import recipe</h1>
      </div>
      <ImportClient />
    </>
  );
}
