"use client";

import { useState } from "react";
import type { ShoppingItemDTO } from "@/lib/shopping-queries";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/format";

export function AddManualItem({
  listId,
  onAdded,
}: {
  listId: string;
  onAdded: (item: ShoppingItemDTO) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/shopping-lists/${listId}/items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: name.trim(),
          quantity: quantity ? Number(quantity) : null,
          unit: unit.trim() || null,
          category,
        }),
      });
      const body = await res.json();
      if (res.ok) {
        onAdded(body.data);
        setName("");
        setQuantity("");
        setUnit("");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary w-full">
        + Add item
      </button>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex gap-2">
        <input className="input !px-2 w-16 text-center" placeholder="Qty" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <input className="input !px-2 w-16" placeholder="Unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
        <input
          className="input !px-2 flex-1"
          placeholder="Item name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          autoFocus
        />
      </div>
      <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORY_ORDER.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button onClick={add} disabled={busy || !name.trim()} className="btn-primary flex-1">
          {busy ? "Adding…" : "Add"}
        </button>
        <button onClick={() => setOpen(false)} className="btn-ghost">
          Done
        </button>
      </div>
    </div>
  );
}
