"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { weekLabel } from "@/lib/week";

export function CopyWeekSheet({
  weekStart,
  onClose,
  onCopied,
}: {
  weekStart: string;
  onClose: () => void;
  onCopied: () => void;
}) {
  const [weeks, setWeeks] = useState<Array<{ weekStart: string; entryCount: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/v1/meal-plans?exclude=${weekStart}`);
      if (res.ok) setWeeks((await res.json()).data);
      setLoading(false);
    })();
  }, [weekStart]);

  async function copyFrom(from: string) {
    setBusy(from);
    const res = await fetch(`/api/v1/meal-plans/${weekStart}/copy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromWeekStart: from }),
    });
    if (res.ok) onCopied();
    else setBusy(null);
  }

  return (
    <Sheet title="Copy another week" onClose={onClose}>
      <p className="mb-3 text-sm text-black/55 dark:text-white/55">
        Copy all meals from a previous week into this one as a starting point.
      </p>
      {loading ? (
        <p className="py-6 text-center text-sm text-black/50">Loading…</p>
      ) : weeks.length === 0 ? (
        <p className="py-6 text-center text-sm text-black/50 dark:text-white/50">
          No other planned weeks to copy from yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {weeks.map((w) => (
            <li key={w.weekStart}>
              <button
                onClick={() => copyFrom(w.weekStart)}
                disabled={!!busy}
                className="card flex w-full items-center justify-between p-3 text-left"
              >
                <span>
                  <span className="font-medium">{weekLabel(w.weekStart)}</span>
                  <span className="block text-xs text-black/45 dark:text-white/45">
                    {w.entryCount} meal{w.entryCount !== 1 ? "s" : ""}
                  </span>
                </span>
                <span className="text-sm text-brand-600 dark:text-brand-300">
                  {busy === w.weekStart ? "Copying…" : "Copy"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
