"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ShoppingListDTO, ShoppingItemDTO } from "@/lib/shopping-queries";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatQuantity,
} from "@/lib/format";
import {
  weekLabel,
  addDays,
  dateOnly,
  formatDateOnly,
} from "@/lib/week";
import { EmptyState } from "@/components/empty-state";
import { AddManualItem } from "./add-manual-item";
import { mutateOrQueue, setupAutoFlush } from "@/lib/offline-queue";

export function ShoppingClient({
  weekStart,
  initialList,
}: {
  weekStart: string;
  initialList: ShoppingListDTO | null;
}) {
  const router = useRouter();
  const [list, setList] = useState(initialList);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [hideChecked, setHideChecked] = useState(false);

  useEffect(() => {
    setList(initialList);
  }, [initialList, weekStart]);

  // Replay any offline check-offs when connectivity returns.
  useEffect(() => setupAutoFlush(), []);

  function goWeek(offset: number) {
    const target = formatDateOnly(addDays(dateOnly(weekStart), offset * 7));
    router.push(`/app/shopping?week=${target}`);
  }

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(
        `/api/v1/meal-plans/${weekStart}/shopping-list/generate`,
        { method: "POST" },
      );
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? "Couldn't generate the list.");
        return;
      }
      setList(body.data);
    } finally {
      setGenerating(false);
    }
  }

  async function toggle(item: ShoppingItemDTO) {
    if (!list) return;
    const checked = !item.checked;
    setList(patchItem(list, item.id, { checked })); // optimistic
    // Queues automatically if offline, syncing when back online.
    await mutateOrQueue({
      key: `item:${item.id}`,
      url: `/api/v1/shopping-list-items/${item.id}`,
      method: "PATCH",
      body: { checked },
    });
  }

  async function remove(item: ShoppingItemDTO) {
    if (!list) return;
    setList(removeItem(list, item.id)); // optimistic
    await mutateOrQueue({
      key: `item:${item.id}`,
      url: `/api/v1/shopping-list-items/${item.id}`,
      method: "DELETE",
    });
  }

  function onManualAdded(item: ShoppingItemDTO) {
    setList((l) =>
      l
        ? { ...l, items: [...l.items, item], itemCount: l.itemCount + 1 }
        : l,
    );
  }

  const header = (
    <header className="safe-top sticky top-0 z-20 border-b border-black/5 bg-[var(--background)]/90 px-4 py-3 backdrop-blur dark:border-white/10">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold leading-tight">Shopping</h1>
          <p className="text-sm text-black/55 dark:text-white/55">
            {weekLabel(weekStart)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => goWeek(-1)} className="btn-ghost !px-2" aria-label="Previous week">
            <Chevron dir="left" />
          </button>
          <button onClick={() => router.push("/app/shopping")} className="btn-ghost !px-2 text-sm">
            Today
          </button>
          <button onClick={() => goWeek(1)} className="btn-ghost !px-2" aria-label="Next week">
            <Chevron dir="right" />
          </button>
        </div>
      </div>
    </header>
  );

  if (!list) {
    return (
      <>
        {header}
        <EmptyState
          title="No shopping list yet"
          description="Generate a list from this week's meal plan. Recipes are aggregated and sub-recipes expanded automatically."
          action={
            <div className="space-y-2">
              <button onClick={generate} disabled={generating} className="btn-primary">
                {generating ? "Generating…" : "Generate from this week"}
              </button>
              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : null}
            </div>
          }
        />
      </>
    );
  }

  // Group items by category in store-walk order.
  const groups = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    items: list.items
      .filter((i) => i.category === cat)
      .filter((i) => (hideChecked ? !i.checked : true))
      .sort((a, b) => Number(a.checked) - Number(b.checked)),
  })).filter((g) => g.items.length > 0);

  const progress = list.itemCount
    ? Math.round((list.checkedCount / list.itemCount) * 100)
    : 0;

  return (
    <>
      {header}
      <div className="p-4">
        {/* Progress + actions */}
        <div className="card mb-4 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {list.checkedCount} of {list.itemCount} done
            </span>
            <button
              onClick={() => setHideChecked((h) => !h)}
              className="text-brand-600 dark:text-brand-300"
            >
              {hideChecked ? "Show checked" : "Hide checked"}
            </button>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={generate} disabled={generating} className="btn-secondary flex-1 !py-1.5 text-sm">
              {generating ? "Regenerating…" : "Regenerate from plan"}
            </button>
          </div>
          {error ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}
        </div>

        {/* Items grouped by category */}
        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-black/50 dark:text-white/50">
            {hideChecked ? "Everything's checked off! 🎉" : "This list is empty."}
          </p>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.category}>
                <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-black/45 dark:text-white/45">
                  {CATEGORY_LABELS[group.category]}
                </h2>
                <ul className="card divide-y divide-black/5 dark:divide-white/10">
                  {group.items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => toggle(item)}
                      onRemove={() => remove(item)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <div className="mt-5">
          <AddManualItem listId={list.id} onAdded={onManualAdded} />
        </div>
      </div>
    </>
  );
}

function ItemRow({
  item,
  onToggle,
  onRemove,
}: {
  item: ShoppingItemDTO;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const qty = formatQuantity(item.quantity, item.unit);
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <button
        onClick={onToggle}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
          item.checked
            ? "border-brand-500 bg-brand-500 text-white"
            : "border-black/20 dark:border-white/25"
        }`}
        aria-label={item.checked ? "Uncheck" : "Check"}
      >
        {item.checked ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 6" />
          </svg>
        ) : null}
      </button>
      <button onClick={onToggle} className="min-w-0 flex-1 text-left">
        <span className={`text-sm ${item.checked ? "text-black/40 line-through dark:text-white/40" : ""}`}>
          {qty ? <span className="font-medium">{qty} </span> : null}
          {item.displayName}
        </span>
        {item.note ? (
          <span className="block text-xs text-black/40 dark:text-white/40">{item.note}</span>
        ) : null}
      </button>
      {item.isManual ? (
        <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] text-black/40 dark:bg-white/10 dark:text-white/40">
          added
        </span>
      ) : null}
      <button onClick={onRemove} className="shrink-0 p-1 text-black/25 hover:text-red-500 dark:text-white/25" aria-label="Remove">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </li>
  );
}

function patchItem(
  list: ShoppingListDTO,
  id: string,
  patch: Partial<ShoppingItemDTO>,
): ShoppingListDTO {
  const items = list.items.map((i) => (i.id === id ? { ...i, ...patch } : i));
  return {
    ...list,
    items,
    checkedCount: items.filter((i) => i.checked).length,
  };
}

function removeItem(list: ShoppingListDTO, id: string): ShoppingListDTO {
  const items = list.items.filter((i) => i.id !== id);
  return {
    ...list,
    items,
    itemCount: items.length,
    checkedCount: items.filter((i) => i.checked).length,
  };
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}
