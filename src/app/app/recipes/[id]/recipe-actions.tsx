"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function RecipeActions({ recipeId }: { recipeId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    const res = await fetch(`/api/v1/recipes/${recipeId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/app/recipes");
      router.refresh();
    } else {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/app/recipes/${recipeId}/edit`} className="btn-secondary !px-3">
        Edit
      </Link>
      {confirming ? (
        <>
          <button className="btn !px-3 bg-red-600 text-white" onClick={del} disabled={busy}>
            {busy ? "Deleting…" : "Confirm"}
          </button>
          <button className="btn-ghost !px-2" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </>
      ) : (
        <button
          className="btn-ghost !px-2 text-red-600 dark:text-red-400"
          onClick={() => setConfirming(true)}
          aria-label="Delete recipe"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" />
          </svg>
        </button>
      )}
    </div>
  );
}
