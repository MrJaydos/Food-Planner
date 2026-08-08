import { SkeletonHeader, SkeletonCard } from "@/components/skeleton";

// Fallback skeleton for /app and any child route without its own loading.tsx.
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} lines={1} />
        ))}
      </div>
    </>
  );
}
