"use client";

import { useState } from "react";
import Link from "next/link";
import type { IdeaDTO } from "@/lib/ideas";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { timeAgo } from "@/lib/format";

/**
 * The quick-capture pile. Everything here is one tap away from being nothing —
 * the composer stays at the top, the list below is just text — because an idea
 * you have to navigate to record is an idea you don't record.
 */
export function IdeasClient({
  initialIdeas,
  showAuthor,
}: {
  initialIdeas: IdeaDTO[];
  showAuthor: boolean;
}) {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDone, setShowDone] = useState(false);

  const open = ideas.filter((i) => !i.done);
  const done = ideas.filter((i) => i.done);

  async function add() {
    const body = text.trim();
    if (!body || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/ideas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: body }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Couldn't save that.");
        return;
      }
      setIdeas((all) => [json.data, ...all]);
      setText(""); // cleared only on success, so nothing is ever lost
    } catch {
      setError("Network error — that one didn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function patch(idea: IdeaDTO, body: Partial<IdeaDTO>) {
    const previous = ideas;
    setIdeas((all) =>
      all.map((i) => (i.id === idea.id ? { ...i, ...body } : i)),
    ); // optimistic
    const res = await fetch(`/api/v1/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!res?.ok) {
      setIdeas(previous);
      setError("Couldn't save that change.");
    }
  }

  async function remove(idea: IdeaDTO) {
    const previous = ideas;
    setIdeas((all) => all.filter((i) => i.id !== idea.id)); // optimistic
    const res = await fetch(`/api/v1/ideas/${idea.id}`, {
      method: "DELETE",
    }).catch(() => null);
    if (!res?.ok) {
      setIdeas(previous);
      setError("Couldn't delete that.");
    }
  }

  return (
    <>
      <PageHeader
        title="Ideas"
        subtitle="Jot it now, make it a recipe later"
      />
      <div className="p-4">
        {/* Composer */}
        <div className="card p-3">
          <textarea
            className="input min-h-[3.25rem] resize-y"
            rows={2}
            placeholder="Thai green curry… or paste a link"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends; Shift+Enter is a newline, for the rare longer note.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                add();
              }
            }}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-black/45 dark:text-white/45">
              Links are picked up automatically.
            </p>
            <button
              onClick={add}
              disabled={saving || !text.trim()}
              className="btn-primary !py-1.5"
            >
              {saving ? "Adding…" : "Add"}
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}

        {/* Open ideas */}
        {open.length === 0 ? (
          <EmptyState
            title={done.length ? "Nothing left to try" : "No ideas yet"}
            description="Anything you'd like to eat one day. A dish name, a link a friend sent, a note about that thing you had out."
            icon={
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.4.3.6.8.6 1.3v.3h5.8v-.3c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3z" />
              </svg>
            }
          />
        ) : (
          <ul className="mt-4 space-y-2.5">
            {open.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                showAuthor={showAuthor}
                onPatch={(body) => patch(idea, body)}
                onRemove={() => remove(idea)}
              />
            ))}
          </ul>
        )}

        {/* Done, tucked away */}
        {done.length > 0 ? (
          <div className="mt-6">
            <button
              onClick={() => setShowDone((s) => !s)}
              className="px-1 text-xs font-semibold uppercase tracking-wide text-black/45 dark:text-white/45"
            >
              {showDone ? "Hide" : "Show"} done ({done.length})
            </button>
            {showDone ? (
              <ul className="mt-2 space-y-2.5">
                {done.map((idea) => (
                  <IdeaCard
                    key={idea.id}
                    idea={idea}
                    showAuthor={showAuthor}
                    onPatch={(body) => patch(idea, body)}
                    onRemove={() => remove(idea)}
                  />
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

function IdeaCard({
  idea,
  showAuthor,
  onPatch,
  onRemove,
}: {
  idea: IdeaDTO;
  showAuthor: boolean;
  onPatch: (body: Partial<IdeaDTO>) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(idea.text);

  function saveEdit() {
    const text = draft.trim();
    setEditing(false);
    if (!text || text === idea.text) return;
    onPatch({ text });
  }

  const draftHref = recipeDraftHref(idea);

  return (
    <li className="card p-3">
      <div className="flex items-start gap-3">
        <button
          onClick={() => onPatch({ done: !idea.done })}
          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
            idea.done
              ? "border-brand-500 bg-brand-500 text-white"
              : "border-black/20 dark:border-white/25"
          }`}
          aria-label={idea.done ? "Move back to ideas" : "Mark as done"}
        >
          {idea.done ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 6" />
            </svg>
          ) : null}
        </button>

        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <textarea
                className="input resize-y"
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveEdit();
                  }
                  if (e.key === "Escape") {
                    setDraft(idea.text);
                    setEditing(false);
                  }
                }}
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={saveEdit} className="btn-primary !py-1.5 text-sm">
                  Save
                </button>
                <button
                  onClick={() => {
                    setDraft(idea.text);
                    setEditing(false);
                  }}
                  className="btn-ghost !py-1.5 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                setDraft(idea.text);
                setEditing(true);
              }}
              className="w-full text-left"
            >
              <p
                className={`whitespace-pre-wrap break-words text-sm ${
                  idea.done ? "text-black/40 line-through dark:text-white/40" : ""
                }`}
              >
                {idea.text}
              </p>
            </button>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-black/45 dark:text-white/45">
            <span>{timeAgo(idea.createdAt)}</span>
            {showAuthor && idea.createdByName ? (
              <span>· {idea.createdByName}</span>
            ) : null}
            {idea.url ? (
              <a
                href={idea.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-brand-600 underline-offset-2 hover:underline dark:text-brand-300"
              >
                · open link
              </a>
            ) : null}
          </div>

          {/* What to do with it, when there's time */}
          <div className="mt-2 flex flex-wrap gap-2">
            {idea.convertedRecipeId ? (
              <Link
                href={`/app/recipes/${idea.convertedRecipeId}`}
                className="btn-secondary !py-1 !px-2.5 text-xs"
              >
                View recipe →
              </Link>
            ) : (
              <Link href={draftHref} className="btn-secondary !py-1 !px-2.5 text-xs">
                {idea.url ? "Import recipe" : "Make a recipe"}
              </Link>
            )}
          </div>
        </div>

        <button
          onClick={onRemove}
          className="shrink-0 p-1 text-black/25 hover:text-red-500 dark:text-white/25"
          aria-label="Delete idea"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </li>
  );
}

/**
 * Where "turn this into a recipe" goes. A jotted link is worth importing; plain
 * text seeds the manual editor, first line as the title and the rest as the
 * description. Either way `fromIdea` travels along so the editor can tick the
 * idea off once the recipe actually saves.
 */
function recipeDraftHref(idea: IdeaDTO): string {
  if (idea.url) {
    const params = new URLSearchParams({ url: idea.url, fromIdea: idea.id });
    return `/app/recipes/import?${params}`;
  }
  const [first, ...rest] = idea.text.trim().split("\n");
  const params = new URLSearchParams({ fromIdea: idea.id });
  params.set("title", first.slice(0, 200));
  const description = rest.join("\n").trim();
  if (description) params.set("description", description.slice(0, 4000));
  return `/app/recipes/new?${params}`;
}
