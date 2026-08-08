import { SkeletonHeader, SkeletonCard } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <div className="p-4">
        {/* Composer */}
        <div className="card space-y-2 p-3">
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="flex justify-end">
            <div className="skeleton h-8 w-20 rounded-xl" />
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={1} />
          ))}
        </div>
      </div>
    </>
  );
}
