"use client";

import { useState, useMemo } from "react";
import type { MealType } from "@prisma/client";
import type { WeekEntryDTO } from "@/lib/meal-plans";
import { Sheet } from "@/components/sheet";
import { lastUsedLabel } from "@/lib/format";
import type { PlannerRecipe, PlannerMember } from "./planner-client";

type Tab = "recipe" | "custom" | "eating_out";

function AssigneeSelect({
  members,
  value,
  onChange,
}: {
  members: PlannerMember[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  if (members.length <= 1) return null;
  return (
    <div>
      <label className="label">For</label>
      <select
        className="input"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">Everyone</option>
        {members.map((m) => (
          <option key={m.membershipId} value={m.membershipId}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AddEntrySheet({
  weekStart,
  day,
  mealType,
  dayLabel,
  recipes,
  members,
  onClose,
  onAdded,
}: {
  weekStart: string;
  day: number;
  mealType: MealType;
  dayLabel: string;
  recipes: PlannerRecipe[];
  members: PlannerMember[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [tab, setTab] = useState<Tab>("recipe");
  const [busy, setBusy] = useState(false);
  const [assignee, setAssignee] = useState<string | null>(null);

  // Recipe tab
  const [q, setQ] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<PlannerRecipe | null>(null);
  const [multiplier, setMultiplier] = useState("1");
  const [surpriseBusy, setSurpriseBusy] = useState(false);

  async function surprise() {
    setSurpriseBusy(true);
    try {
      const params = new URLSearchParams({ mealType });
      if (selectedRecipe) params.set("exclude", selectedRecipe.id);
      const res = await fetch(`/api/v1/recipes/surprise?${params}`);
      if (res.ok) {
        const p = (await res.json()).data;
        setSelectedRecipe({
          id: p.id,
          title: p.title,
          imageUrl: p.imageUrl,
          suitableFor: p.suitableFor,
          servings: null,
          lastUsedAt: p.lastUsedAt,
        });
      }
    } finally {
      setSurpriseBusy(false);
    }
  }

  // Custom / eating out
  const [customText, setCustomText] = useState("");
  const [note, setNote] = useState("");

  const filtered = useMemo(() => {
    const base = recipes.filter((r) =>
      q ? r.title.toLowerCase().includes(q.toLowerCase()) : true,
    );
    // Prioritise recipes tagged for this meal type, then "haven't had in a
    // while" (never used first, then oldest lastUsedAt first).
    const stamp = (r: PlannerRecipe) =>
      r.lastUsedAt ? new Date(r.lastUsedAt).getTime() : 0;
    return [...base].sort((a, b) => {
      const am = a.suitableFor.includes(mealType) ? 0 : 1;
      const bm = b.suitableFor.includes(mealType) ? 0 : 1;
      return am - bm || stamp(a) - stamp(b) || a.title.localeCompare(b.title);
    });
  }, [recipes, q, mealType]);

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/meal-plans/${weekStart}/entries`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dayOfWeek: day, mealType, ...body }),
      });
      if (res.ok) onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet title={`Add to ${dayLabel}`} onClose={onClose}>
      <div className="mb-3 flex gap-1 rounded-xl bg-black/5 p-1 text-sm dark:bg-white/10">
        {(["recipe", "custom", "eating_out"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 font-medium ${tab === t ? "bg-white shadow-sm dark:bg-white/15" : "text-black/55 dark:text-white/55"}`}
          >
            {t === "recipe" ? "Recipe" : t === "custom" ? "Custom" : "Eating out"}
          </button>
        ))}
      </div>

      {tab === "recipe" ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Search recipes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
            <button
              onClick={surprise}
              disabled={surpriseBusy || recipes.length === 0}
              className="btn-secondary shrink-0 !px-3"
              title="Surprise me"
            >
              {surpriseBusy ? "…" : "🎲 Surprise"}
            </button>
          </div>
          {recipes.length === 0 ? (
            <p className="py-6 text-center text-sm text-black/50 dark:text-white/50">
              No recipes yet. Add some first.
            </p>
          ) : (
            <div className="max-h-52 space-y-1 overflow-y-auto">
              {!q ? (
                <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-black/35 dark:text-white/35">
                  Haven&apos;t had in a while
                </p>
              ) : null}
              {filtered.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRecipe(r)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${selectedRecipe?.id === r.id ? "bg-brand-600 text-white" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {r.title}
                    <span className={`block text-[11px] ${selectedRecipe?.id === r.id ? "opacity-80" : "text-black/40 dark:text-white/40"}`}>
                      {lastUsedLabel(r.lastUsedAt)}
                    </span>
                  </span>
                  {r.suitableFor.includes(mealType) ? (
                    <span className={`shrink-0 text-[10px] ${selectedRecipe?.id === r.id ? "opacity-80" : "text-brand-500"}`}>
                      suits {mealType.toLowerCase()}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
          {selectedRecipe ? (
            <div className="space-y-3 border-t border-black/5 pt-3 dark:border-white/10">
              <p className="text-sm">
                Selected: <span className="font-medium">{selectedRecipe.title}</span>
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Servings ×</label>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={multiplier}
                    onChange={(e) => setMultiplier(e.target.value)}
                  />
                </div>
                <AssigneeSelect members={members} value={assignee} onChange={setAssignee} />
              </div>
              <button
                disabled={busy}
                onClick={() =>
                  post({
                    kind: "RECIPE",
                    recipeId: selectedRecipe.id,
                    servingMultiplier: Number(multiplier) || 1,
                    assigneeMembershipId: assignee,
                  })
                }
                className="btn-primary w-full"
              >
                Add recipe
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "custom" ? (
        <div className="space-y-3">
          <div>
            <label className="label">What&apos;s the meal?</label>
            <input
              className="input"
              placeholder="e.g. Leftovers, Sandwiches"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              autoFocus
            />
          </div>
          <AssigneeSelect members={members} value={assignee} onChange={setAssignee} />
          <button
            disabled={busy || !customText.trim()}
            onClick={() =>
              post({
                kind: "CUSTOM",
                customText: customText.trim(),
                assigneeMembershipId: assignee,
              })
            }
            className="btn-primary w-full"
          >
            Add
          </button>
        </div>
      ) : null}

      {tab === "eating_out" ? (
        <div className="space-y-3">
          <div>
            <label className="label">Note (optional)</label>
            <input
              className="input"
              placeholder="e.g. Pizza night, Mum's"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              autoFocus
            />
          </div>
          <p className="text-xs text-black/50 dark:text-white/50">
            Eating out is skipped when generating your shopping list.
          </p>
          <button
            disabled={busy}
            onClick={() => post({ kind: "EATING_OUT", note: note.trim() || null })}
            className="btn-primary w-full"
          >
            Mark eating out
          </button>
        </div>
      ) : null}
    </Sheet>
  );
}

export function EditEntrySheet({
  entry,
  label,
  members,
  onClose,
  onSaved,
  onDeleted,
}: {
  entry: WeekEntryDTO;
  label: string;
  members: PlannerMember[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [multiplier, setMultiplier] = useState(String(entry.servingMultiplier));
  const [assignee, setAssignee] = useState<string | null>(entry.assigneeMembershipId);
  const [customText, setCustomText] = useState(entry.customText ?? "");
  const [note, setNote] = useState(entry.note ?? "");

  async function save() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { assigneeMembershipId: assignee };
      if (entry.kind === "RECIPE") body.servingMultiplier = Number(multiplier) || 1;
      if (entry.kind === "CUSTOM") body.customText = customText.trim();
      if (entry.kind === "EATING_OUT") body.note = note.trim() || null;
      else body.note = note.trim() || null;
      const res = await fetch(`/api/v1/meal-plans/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onSaved();
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  async function del() {
    setBusy(true);
    await fetch(`/api/v1/meal-plans/entries/${entry.id}`, { method: "DELETE" });
    onDeleted();
  }

  const title =
    entry.kind === "RECIPE"
      ? entry.recipeTitle ?? "Recipe"
      : entry.kind === "CUSTOM"
        ? "Custom meal"
        : "Eating out";

  return (
    <Sheet title={title} onClose={onClose}>
      <p className="mb-3 text-sm text-black/55 dark:text-white/55">{label}</p>
      <div className="space-y-3">
        {entry.kind === "RECIPE" ? (
          <div>
            <label className="label">Servings ×</label>
            <input
              className="input"
              inputMode="decimal"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
            />
          </div>
        ) : null}
        {entry.kind === "CUSTOM" ? (
          <div>
            <label className="label">Meal</label>
            <input className="input" value={customText} onChange={(e) => setCustomText(e.target.value)} />
          </div>
        ) : null}
        {entry.kind === "EATING_OUT" ? (
          <div>
            <label className="label">Note</label>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        ) : null}
        {entry.kind !== "EATING_OUT" ? (
          <AssigneeSelect members={members} value={assignee} onChange={setAssignee} />
        ) : null}

        <div className="flex gap-2 pt-2">
          <button onClick={save} disabled={busy} className="btn-primary flex-1">
            Save
          </button>
          <button onClick={del} disabled={busy} className="btn bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
            Remove
          </button>
        </div>
      </div>
    </Sheet>
  );
}
