"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { MealType } from "@prisma/client";
import type { WeekPlanDTO, WeekEntryDTO } from "@/lib/meal-plans";
import {
  DAY_NAMES,
  DAY_SHORT,
  addDays,
  dateOnly,
  formatDateOnly,
  weekLabel,
} from "@/lib/week";
import { AddEntrySheet, EditEntrySheet } from "./entry-sheets";
import { CopyWeekSheet } from "./copy-week-sheet";

export interface PlannerRecipe {
  id: string;
  title: string;
  imageUrl: string | null;
  suitableFor: MealType[];
  servings: number | null;
}
export interface PlannerMember {
  membershipId: string;
  name: string;
}

const MEALS: MealType[] = ["BREAKFAST", "LUNCH", "DINNER"];
const MEAL_LABEL: Record<MealType, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

export function PlannerClient({
  weekStart,
  initialPlan,
  recipes,
  members,
}: {
  weekStart: string;
  initialPlan: WeekPlanDTO;
  recipes: PlannerRecipe[];
  members: PlannerMember[];
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(initialPlan);
  const [addTarget, setAddTarget] = useState<{
    day: number;
    mealType: MealType;
  } | null>(null);
  const [editTarget, setEditTarget] = useState<{
    entry: WeekEntryDTO;
    label: string;
  } | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);

  useEffect(() => {
    setPlan(initialPlan);
  }, [initialPlan, weekStart]);

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/v1/meal-plans/${weekStart}`);
    if (res.ok) setPlan((await res.json()).data);
  }, [weekStart]);

  function goWeek(offset: number) {
    const target = formatDateOnly(addDays(dateOnly(weekStart), offset * 7));
    router.push(`/app/planner?week=${target}`);
  }

  async function deleteEntry(id: string) {
    setPlan((p) => removeEntry(p, id)); // optimistic
    await fetch(`/api/v1/meal-plans/entries/${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <>
      {/* Header */}
      <header className="safe-top sticky top-0 z-20 border-b border-black/5 bg-[var(--background)]/90 px-4 py-3 backdrop-blur dark:border-white/10">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold leading-tight">Planner</h1>
            <p className="text-sm text-black/55 dark:text-white/55">
              {weekLabel(weekStart)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => goWeek(-1)} className="btn-ghost !px-2" aria-label="Previous week">
              <Chevron dir="left" />
            </button>
            <button
              onClick={() => router.push("/app/planner")}
              className="btn-ghost !px-2 text-sm"
            >
              Today
            </button>
            <button onClick={() => goWeek(1)} className="btn-ghost !px-2" aria-label="Next week">
              <Chevron dir="right" />
            </button>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={() => setCopyOpen(true)} className="btn-secondary !py-1.5 text-sm">
            Copy another week
          </button>
        </div>
      </header>

      {/* Week grid */}
      <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-7 lg:gap-2">
        {plan.days.map((day) => {
          const today = day.date === formatDateOnly(new Date());
          return (
            <section
              key={day.dayOfWeek}
              className={`card p-3 ${today ? "ring-2 ring-brand-500" : ""}`}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-semibold">
                  <span className="lg:hidden">{DAY_NAMES[day.dayOfWeek]}</span>
                  <span className="hidden lg:inline">{DAY_SHORT[day.dayOfWeek]}</span>
                </h2>
                <span className="text-xs text-black/40 dark:text-white/40">
                  {dateOnly(day.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    timeZone: "UTC",
                  })}
                </span>
              </div>
              <div className="space-y-3">
                {MEALS.map((meal) => (
                  <div key={meal}>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
                      {MEAL_LABEL[meal]}
                    </p>
                    <div className="space-y-1.5">
                      {day.meals[meal].map((entry) => (
                        <EntryChip
                          key={entry.id}
                          entry={entry}
                          onEdit={() =>
                            setEditTarget({
                              entry,
                              label: `${DAY_NAMES[day.dayOfWeek]} · ${MEAL_LABEL[meal]}`,
                            })
                          }
                          onDelete={() => deleteEntry(entry.id)}
                        />
                      ))}
                      <button
                        onClick={() => setAddTarget({ day: day.dayOfWeek, mealType: meal })}
                        className="w-full rounded-lg border border-dashed border-black/15 py-1.5 text-xs text-black/45 hover:border-brand-400 hover:text-brand-600 dark:border-white/15 dark:text-white/45"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {addTarget ? (
        <AddEntrySheet
          weekStart={weekStart}
          day={addTarget.day}
          mealType={addTarget.mealType}
          dayLabel={`${DAY_NAMES[addTarget.day]} · ${MEAL_LABEL[addTarget.mealType]}`}
          recipes={recipes}
          members={members}
          onClose={() => setAddTarget(null)}
          onAdded={() => {
            setAddTarget(null);
            refetch();
          }}
        />
      ) : null}

      {editTarget ? (
        <EditEntrySheet
          entry={editTarget.entry}
          label={editTarget.label}
          members={members}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            refetch();
          }}
          onDeleted={() => {
            setEditTarget(null);
            refetch();
          }}
        />
      ) : null}

      {copyOpen ? (
        <CopyWeekSheet
          weekStart={weekStart}
          onClose={() => setCopyOpen(false)}
          onCopied={() => {
            setCopyOpen(false);
            refetch();
          }}
        />
      ) : null}
    </>
  );
}

function removeEntry(plan: WeekPlanDTO, id: string): WeekPlanDTO {
  return {
    ...plan,
    days: plan.days.map((d) => ({
      ...d,
      meals: {
        BREAKFAST: d.meals.BREAKFAST.filter((e) => e.id !== id),
        LUNCH: d.meals.LUNCH.filter((e) => e.id !== id),
        DINNER: d.meals.DINNER.filter((e) => e.id !== id),
      },
    })),
  };
}

function EntryChip({
  entry,
  onEdit,
  onDelete,
}: {
  entry: WeekEntryDTO;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const base =
    "group relative w-full rounded-lg px-2.5 py-1.5 text-left text-sm";
  if (entry.kind === "EATING_OUT") {
    return (
      <div className={`${base} bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200`}>
        <button onClick={onEdit} className="block w-full pr-5 text-left">
          <span className="font-medium">🍽 Eating out</span>
          {entry.note ? <span className="block text-xs opacity-80">{entry.note}</span> : null}
        </button>
        <DeleteX onDelete={onDelete} />
      </div>
    );
  }
  if (entry.kind === "CUSTOM") {
    return (
      <div className={`${base} bg-black/[0.04] dark:bg-white/[0.06]`}>
        <button onClick={onEdit} className="block w-full pr-5 text-left">
          <span>{entry.customText}</span>
          <AssigneeTag entry={entry} />
        </button>
        <DeleteX onDelete={onDelete} />
      </div>
    );
  }
  return (
    <div className={`${base} bg-brand-50 text-brand-900 dark:bg-brand-900/40 dark:text-brand-100`}>
      <button onClick={onEdit} className="block w-full pr-5 text-left">
        <span className="font-medium leading-tight">{entry.recipeTitle}</span>
        <span className="flex flex-wrap items-center gap-1">
          {entry.servingMultiplier !== 1 ? (
            <span className="text-xs opacity-70">×{entry.servingMultiplier}</span>
          ) : null}
          <AssigneeTag entry={entry} />
        </span>
      </button>
      <DeleteX onDelete={onDelete} />
    </div>
  );
}

function AssigneeTag({ entry }: { entry: WeekEntryDTO }) {
  if (!entry.assigneeName) return null;
  return (
    <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-medium dark:bg-white/15">
      {entry.assigneeName}
    </span>
  );
}

function DeleteX({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      onClick={onDelete}
      className="absolute right-1 top-1 rounded p-0.5 text-black/30 opacity-0 transition group-hover:opacity-100 hover:text-red-500 dark:text-white/30"
      aria-label="Remove"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}
