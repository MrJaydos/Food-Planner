"use client";

import { useState } from "react";
import { RecipeEditor, type RecipeEditorInitial } from "@/components/recipe-editor";

export function ImportClient({
  initialUrl,
  fromIdeaId,
}: {
  initialUrl?: string;
  fromIdeaId?: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<RecipeEditorInitial | null>(null);
  const [warn, setWarn] = useState("");

  async function doImport(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setWarn("");
    try {
      const res = await fetch("/api/v1/recipes/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? "Import failed.");
        return;
      }
      const p = body.data;
      if (!p.matched) {
        setWarn(
          "We couldn't find structured recipe data on that page — check the details below carefully.",
        );
      }
      setPreview({
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
        servings: p.servings,
        prepTimeMinutes: p.prepTimeMinutes,
        cookTimeMinutes: p.cookTimeMinutes,
        steps: p.steps,
        tags: p.tags,
        sourceUrl: p.sourceUrl,
        ingredients: p.ingredients.map(
          (i: {
            quantity: number | null;
            unit: string | null;
            name: string;
            note: string | null;
          }) => ({
            quantity: i.quantity,
            unit: i.unit,
            name: i.name,
            note: i.note,
          }),
        ),
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (preview) {
    return (
      <>
        {warn ? (
          <p className="mx-4 mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {warn}
          </p>
        ) : (
          <p className="mx-4 mt-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:bg-brand-900/40 dark:text-brand-100">
            Imported! Review and edit below, then save.
          </p>
        )}
        <RecipeEditor mode="create" initial={preview} fromIdeaId={fromIdeaId} />
      </>
    );
  }

  return (
    <form onSubmit={doImport} className="space-y-4 p-4">
      <div className="card space-y-3 p-4">
        <label className="label">Recipe URL</label>
        <input
          className="input"
          type="url"
          inputMode="url"
          placeholder="https://example.com/best-lasagne"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <p className="text-xs text-black/50 dark:text-white/50">
          We&apos;ll read the page and pre-fill a recipe for you to review.
        </p>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Importing…" : "Import"}
        </button>
      </div>
    </form>
  );
}
