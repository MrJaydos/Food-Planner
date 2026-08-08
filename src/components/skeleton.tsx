/**
 * Shared building blocks for route-level loading.tsx skeletons.
 *
 * These render instantly on navigation (every /app page is force-dynamic, so
 * there's a real server round-trip to cover) and are replaced by the page as
 * soon as it streams in.
 */

export function SkeletonHeader({ action = false }: { action?: boolean }) {
  return (
    <header className="safe-top sticky top-0 z-20 border-b border-black/5 bg-[var(--background)]/90 px-4 py-3 backdrop-blur dark:border-white/10">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-2">
          <div className="skeleton h-5 w-32" />
          <div className="skeleton h-3.5 w-24" />
        </div>
        {action ? <div className="skeleton h-8 w-28 rounded-xl" /> : null}
      </div>
    </header>
  );
}

/** A card with a title line and a couple of body lines. */
export function SkeletonCard({ lines = 2 }: { lines?: number }) {
  return (
    <div className="card space-y-2.5 p-5">
      <div className="skeleton h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-3 w-full"
          style={{ maxWidth: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

/** A checkable-list row: small square + a text line. */
export function SkeletonRow() {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <div className="skeleton h-6 w-6 shrink-0 rounded-md" />
      <div className="skeleton h-3.5 flex-1" style={{ maxWidth: "60%" }} />
    </li>
  );
}
