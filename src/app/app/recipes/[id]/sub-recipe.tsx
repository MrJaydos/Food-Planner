"use client";

import { useState } from "react";
import Link from "next/link";
import type { RecipeComponentDTO } from "@/lib/recipe-queries";
import { formatQuantity } from "@/lib/format";

// A sub-recipe line item that expands inline to show its ingredients & steps,
// so you can cook everything from one screen.
export function SubRecipeAccordion({
  component,
}: {
  component: RecipeComponentDTO;
}) {
  const [open, setOpen] = useState(false);
  const { child, quantityMultiplier } = component;

  return (
    <li className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="min-w-[64px] shrink-0 text-sm font-medium text-brand-700 dark:text-brand-300">
          {quantityMultiplier !== 1 ? `${formatQuantity(quantityMultiplier)}×` : ""}
        </span>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-1.5 text-left text-sm font-medium text-brand-700 dark:text-brand-300"
        >
          {child.title}
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition ${open ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        <Link
          href={`/app/recipes/${child.id}`}
          className="text-xs text-black/40 underline dark:text-white/40"
        >
          open
        </Link>
      </div>

      {component.note ? (
        <p className="ml-[76px] mt-0.5 text-xs text-black/45 dark:text-white/45">
          {component.note}
        </p>
      ) : null}

      {open ? (
        <div className="ml-[76px] mt-2 space-y-3 border-l-2 border-brand-100 pl-3 dark:border-brand-900/50">
          {child.ingredients.length > 0 ? (
            <ul className="space-y-1">
              {child.ingredients.map((ing) => (
                <li key={ing.id} className="text-sm">
                  <span className="font-medium text-brand-700 dark:text-brand-300">
                    {formatQuantity(ing.quantity, ing.unit)}
                  </span>{" "}
                  {ing.name}
                  {ing.note ? (
                    <span className="text-black/45 dark:text-white/45"> · {ing.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {child.steps.length > 0 ? (
            <ol className="list-decimal space-y-1 pl-4 text-sm text-black/70 dark:text-white/70">
              {child.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
