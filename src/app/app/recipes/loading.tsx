import { SkeletonHeader, SkeletonCard } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonHeader action />
      <div className="p-4">
        <div className="skeleton h-11 w-full rounded-xl" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </>
  );
}
