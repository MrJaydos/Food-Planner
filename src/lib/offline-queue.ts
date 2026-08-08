"use client";

// A tiny offline mutation queue for shopping-list check-offs and removals.
// When a mutation fails because the device is offline, it's persisted to
// localStorage and replayed automatically when connectivity returns. This keeps
// the in-store "bad signal" scenario working: check things off offline, sync
// later.

export interface QueuedMutation {
  key: string; // dedupe key (e.g. the item URL)
  url: string;
  method: string;
  body?: unknown;
}

const STORAGE_KEY = "fp_offline_queue_v1";

function read(): QueuedMutation[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(items: QueuedMutation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* storage full / unavailable — best effort */
  }
}

/** Enqueue (or replace) a mutation. Latest write for a key wins. */
export function enqueue(m: QueuedMutation): void {
  const items = read().filter((i) => i.key !== m.key);
  items.push(m);
  write(items);
}

export function hasPending(): boolean {
  return read().length > 0;
}

/**
 * Attempt a mutation immediately; if it fails (offline/network), queue it for
 * later. Returns true if it succeeded online, false if it was queued.
 */
export async function mutateOrQueue(m: QueuedMutation): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    enqueue(m);
    return false;
  }
  try {
    const res = await fetch(m.url, {
      method: m.method,
      headers: m.body ? { "content-type": "application/json" } : undefined,
      body: m.body ? JSON.stringify(m.body) : undefined,
    });
    if (!res.ok && res.status >= 500) throw new Error("server");
    return true;
  } catch {
    enqueue(m);
    return false;
  }
}

let flushing = false;

/** Replay all queued mutations in order. Kept items that still fail remain. */
export async function flushQueue(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    let items = read();
    const remaining: QueuedMutation[] = [];
    for (const m of items) {
      try {
        const res = await fetch(m.url, {
          method: m.method,
          headers: m.body ? { "content-type": "application/json" } : undefined,
          body: m.body ? JSON.stringify(m.body) : undefined,
        });
        // Treat 4xx as resolved (item may have been deleted server-side).
        if (!res.ok && res.status >= 500) remaining.push(m);
      } catch {
        remaining.push(m);
      }
    }
    items = remaining;
    write(items);
  } finally {
    flushing = false;
  }
}

/** Register a listener that flushes the queue when the device comes online. */
export function setupAutoFlush(): () => void {
  const handler = () => {
    void flushQueue();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("online", handler);
    if (navigator.onLine) void flushQueue();
  }
  return () => window.removeEventListener("online", handler);
}
