"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseIngredientLine } from "@/lib/ingredient-parse";

type MealType = "BREAKFAST" | "LUNCH" | "DINNER";

let uid = 0;
const nextKey = () => `k${uid++}`;

interface IngredientRow {
  key: string;
  quantity: string;
  unit: string;
  name: string;
  note: string;
}

interface ComponentRow {
  key: string;
  childRecipeId: string;
  title: string;
  quantityMultiplier: string;
  note: string;
}

export interface RecipeEditorInitial {
  title?: string;
  description?: string | null;
  servings?: number | null;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  steps?: string[];
  tags?: string[];
  suitableFor?: MealType[];
  sourceUrl?: string | null;
  imageUrl?: string | null;
  ingredients?: Array<{
    quantity?: number | null;
    unit?: string | null;
    name: string;
    note?: string | null;
  }>;
  components?: Array<{
    childRecipeId: string;
    title: string;
    quantityMultiplier?: number;
    note?: string | null;
  }>;
}

const MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER"];
const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

export function RecipeEditor({
  mode,
  recipeId,
  initial,
  fromIdeaId,
}: {
  mode: "create" | "edit";
  recipeId?: string;
  initial?: RecipeEditorInitial;
  /** The quick note this recipe grew out of; ticked off once the save lands. */
  fromIdeaId?: string;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [servings, setServings] = useState(
    initial?.servings != null ? String(initial.servings) : "",
  );
  const [prep, setPrep] = useState(
    initial?.prepTimeMinutes != null ? String(initial.prepTimeMinutes) : "",
  );
  const [cook, setCook] = useState(
    initial?.cookTimeMinutes != null ? String(initial.cookTimeMinutes) : "",
  );
  const [suitableFor, setSuitableFor] = useState<Set<MealType>>(
    new Set(initial?.suitableFor ?? []),
  );
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(
    initial?.imageUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);

  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    (initial?.ingredients ?? []).map((i) => ({
      key: nextKey(),
      quantity: i.quantity != null ? String(i.quantity) : "",
      unit: i.unit ?? "",
      name: i.name,
      note: i.note ?? "",
    })),
  );
  const [quickAdd, setQuickAdd] = useState("");

  const [components, setComponents] = useState<ComponentRow[]>(
    (initial?.components ?? []).map((c) => ({
      key: nextKey(),
      childRecipeId: c.childRecipeId,
      title: c.title,
      quantityMultiplier: String(c.quantityMultiplier ?? 1),
      note: c.note ?? "",
    })),
  );

  const [steps, setSteps] = useState<string[]>(initial?.steps ?? []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // --- Ingredients ---
  function addIngredientRow() {
    setIngredients((r) => [
      ...r,
      { key: nextKey(), quantity: "", unit: "", name: "", note: "" },
    ]);
  }
  function updateIngredient(key: string, patch: Partial<IngredientRow>) {
    setIngredients((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }
  function removeIngredient(key: string) {
    setIngredients((r) => r.filter((row) => row.key !== key));
  }
  function applyQuickAdd() {
    const parsed = quickAdd
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const p = parseIngredientLine(line);
        return {
          key: nextKey(),
          quantity: p.quantity != null ? String(p.quantity) : "",
          unit: p.unit ?? "",
          name: p.name,
          note: p.note ?? "",
        };
      });
    if (parsed.length) setIngredients((r) => [...r, ...parsed]);
    setQuickAdd("");
  }

  // --- Tags ---
  function addTag(raw: string) {
    const t = raw.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags((x) => [...x, t]);
    setTagInput("");
  }

  // --- Steps ---
  function addStep() {
    setSteps((s) => [...s, ""]);
  }
  function updateStep(i: number, value: string) {
    setSteps((s) => s.map((st, idx) => (idx === i ? value : st)));
  }
  function removeStep(i: number) {
    setSteps((s) => s.filter((_, idx) => idx !== i));
  }
  function moveStep(i: number, dir: -1 | 1) {
    setSteps((s) => {
      const j = i + dir;
      if (j < 0 || j >= s.length) return s;
      const copy = [...s];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  // --- Image ---
  async function onImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/uploads", { method: "POST", body: fd });
      const body = await res.json();
      if (res.ok) setImageUrl(body.data.url);
      else setError(body?.error?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // --- Components (sub-recipes) ---
  function addComponent(childRecipeId: string, childTitle: string) {
    if (components.some((c) => c.childRecipeId === childRecipeId)) return;
    setComponents((c) => [
      ...c,
      {
        key: nextKey(),
        childRecipeId,
        title: childTitle,
        quantityMultiplier: "1",
        note: "",
      },
    ]);
  }
  function updateComponent(key: string, patch: Partial<ComponentRow>) {
    setComponents((c) => c.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }
  function removeComponent(key: string) {
    setComponents((c) => c.filter((row) => row.key !== key));
  }

  // --- Save ---
  async function save() {
    setError("");
    if (!title.trim()) {
      setError("Please give the recipe a title.");
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      servings: servings ? Number(servings) : null,
      prepTimeMinutes: prep ? Number(prep) : null,
      cookTimeMinutes: cook ? Number(cook) : null,
      steps: steps.map((s) => s.trim()).filter(Boolean),
      tags,
      suitableFor: [...suitableFor],
      sourceUrl: initial?.sourceUrl?.trim() || null,
      imageUrl: imageUrl || null,
      ingredients: ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({
          name: i.name.trim(),
          quantity: i.quantity ? Number(i.quantity) : null,
          unit: i.unit.trim() || null,
          note: i.note.trim() || null,
        })),
      components: components.map((c) => ({
        childRecipeId: c.childRecipeId,
        quantityMultiplier: c.quantityMultiplier
          ? Number(c.quantityMultiplier)
          : 1,
        note: c.note.trim() || null,
      })),
    };

    try {
      const url =
        mode === "edit" ? `/api/v1/recipes/${recipeId}` : "/api/v1/recipes";
      const res = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? "Couldn't save the recipe.");
        setSaving(false);
        return;
      }
      const id = mode === "edit" ? recipeId : body.data.id;
      if (fromIdeaId && mode === "create") {
        // Best-effort: the recipe is already saved, so a failure here should
        // leave the idea sitting in the list rather than block the redirect.
        await fetch(`/api/v1/ideas/${fromIdeaId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ done: true, convertedRecipeId: id }),
        }).catch(() => null);
      }
      router.push(`/app/recipes/${id}`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-4 pb-24">
      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {/* Basics */}
      <div className="card space-y-4 p-4">
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Steak Tacos"
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[64px]"
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Servings</label>
            <input className="input" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} />
          </div>
          <div>
            <label className="label">Prep (min)</label>
            <input className="input" inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value)} />
          </div>
          <div>
            <label className="label">Cook (min)</label>
            <input className="input" inputMode="numeric" value={cook} onChange={(e) => setCook(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Suitable for</label>
          <div className="flex gap-2">
            {MEAL_TYPES.map((m) => {
              const on = suitableFor.has(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    setSuitableFor((s) => {
                      const n = new Set(s);
                      if (n.has(m)) n.delete(m);
                      else n.add(m);
                      return n;
                    })
                  }
                  className={`btn !px-3 ${on ? "bg-brand-600 text-white" : "bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70"}`}
                >
                  {MEAL_LABEL[m]}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="label">Tags</label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-xs dark:bg-white/10">
                {t}
                <button type="button" onClick={() => setTags((x) => x.filter((y) => y !== t))} className="text-black/40">
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            className="input mt-2"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder="Add a tag, press Enter"
          />
        </div>
        <div>
          <label className="label">Photo</label>
          {imageUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-40 w-full rounded-xl object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl(null)}
                className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="btn-secondary cursor-pointer">
              {uploading ? "Uploading…" : "Upload photo"}
              <input type="file" accept="image/*" className="hidden" onChange={onImageChange} disabled={uploading} />
            </label>
          )}
        </div>
      </div>

      {/* Ingredients */}
      <div className="card space-y-3 p-4">
        <h2 className="font-semibold">Ingredients</h2>
        <div className="space-y-2">
          {ingredients.map((row) => (
            <div key={row.key} className="flex items-start gap-2">
              <input className="input !px-2 w-14 text-center" placeholder="Qty" value={row.quantity} onChange={(e) => updateIngredient(row.key, { quantity: e.target.value })} />
              <input className="input !px-2 w-16" placeholder="Unit" value={row.unit} onChange={(e) => updateIngredient(row.key, { unit: e.target.value })} />
              <input className="input !px-2 flex-1" placeholder="Ingredient" value={row.name} onChange={(e) => updateIngredient(row.key, { name: e.target.value })} />
              <button type="button" onClick={() => removeIngredient(row.key)} className="btn-ghost !px-2 text-black/40">×</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addIngredientRow} className="btn-secondary w-full">
          + Add ingredient
        </button>
        <details className="rounded-xl bg-black/[0.03] p-3 dark:bg-white/5">
          <summary className="cursor-pointer text-sm font-medium">Paste multiple lines</summary>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">One ingredient per line — we&apos;ll parse quantity &amp; unit.</p>
          <textarea
            className="input mt-2 min-h-[90px] font-mono text-xs"
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            placeholder={"2 cups flour\n1 tsp salt\n3 large eggs"}
          />
          <button type="button" onClick={applyQuickAdd} className="btn-secondary mt-2">
            Parse &amp; add
          </button>
        </details>
      </div>

      {/* Sub-recipes */}
      <div className="card space-y-3 p-4">
        <h2 className="font-semibold">Sub-recipes</h2>
        <p className="text-sm text-black/55 dark:text-white/55">
          Include another recipe as a component (e.g. a sauce). It&apos;s expanded
          into base ingredients on your shopping list.
        </p>
        {components.length > 0 ? (
          <ul className="space-y-2">
            {components.map((c) => (
              <li key={c.key} className="flex items-center gap-2">
                <input className="input !px-2 w-16 text-center" value={c.quantityMultiplier} onChange={(e) => updateComponent(c.key, { quantityMultiplier: e.target.value })} aria-label="multiplier" />
                <span className="text-sm text-black/40">×</span>
                <span className="flex-1 truncate text-sm font-medium">{c.title}</span>
                <button type="button" onClick={() => removeComponent(c.key)} className="btn-ghost !px-2 text-black/40">×</button>
              </li>
            ))}
          </ul>
        ) : null}
        <SubRecipePicker
          excludeId={recipeId}
          existing={components.map((c) => c.childRecipeId)}
          onPick={addComponent}
        />
      </div>

      {/* Steps */}
      <div className="card space-y-3 p-4">
        <h2 className="font-semibold">Method</h2>
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2">
            <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">{i + 1}</span>
            <textarea className="input min-h-[52px] flex-1" value={step} onChange={(e) => updateStep(i, e.target.value)} placeholder={`Step ${i + 1}`} />
            <div className="flex flex-col">
              <button type="button" onClick={() => moveStep(i, -1)} className="btn-ghost !px-1.5 !py-0.5 text-black/40">↑</button>
              <button type="button" onClick={() => moveStep(i, 1)} className="btn-ghost !px-1.5 !py-0.5 text-black/40">↓</button>
              <button type="button" onClick={() => removeStep(i)} className="btn-ghost !px-1.5 !py-0.5 text-red-500">×</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addStep} className="btn-secondary w-full">
          + Add step
        </button>
      </div>

      {/* Save bar */}
      <div className="safe-bottom fixed inset-x-0 bottom-16 z-20 mx-auto max-w-2xl px-4">
        <button onClick={save} disabled={saving} className="btn-primary w-full shadow-lg">
          {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Save recipe"}
        </button>
      </div>
    </div>
  );
}

function SubRecipePicker({
  excludeId,
  existing,
  onPick,
}: {
  excludeId?: string;
  existing: string[];
  onPick: (id: string, title: string) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{ id: string; title: string }>>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const params = new URLSearchParams({ q });
      if (excludeId) params.set("exclude", excludeId);
      const res = await fetch(`/api/v1/recipes/search?${params}`);
      if (res.ok) {
        const body = await res.json();
        setResults(body.data);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, open, excludeId]);

  async function createInline() {
    if (!q.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: q.trim() }),
      });
      const body = await res.json();
      if (res.ok) {
        onPick(body.data.id, q.trim());
        setQ("");
        setOpen(false);
      }
    } finally {
      setCreating(false);
    }
  }

  const available = results.filter((r) => !existing.includes(r.id));

  return (
    <div>
      <input
        className="input"
        placeholder="Search recipes to add…"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => setQ(e.target.value)}
      />
      {open && (q || available.length > 0) ? (
        <div className="mt-2 space-y-1 rounded-xl border border-black/10 p-1 dark:border-white/10">
          {available.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onPick(r.id, r.title);
                setQ("");
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
            >
              {r.title}
            </button>
          ))}
          {q.trim() && available.length === 0 ? (
            <button
              type="button"
              onClick={createInline}
              disabled={creating}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/40"
            >
              {creating ? "Creating…" : `+ Create “${q.trim()}” as a new recipe`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
