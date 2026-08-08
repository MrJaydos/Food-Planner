import { SkeletonHeader, SkeletonRow } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <div className="p-4">
        {/* Progress card */}
        <div className="card mb-4 space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div className="skeleton h-3.5 w-24" />
            <div className="skeleton h-3.5 w-20" />
          </div>
          <div className="skeleton h-2 w-full rounded-full" />
          <div className="skeleton h-8 w-full rounded-xl" />
        </div>
        {/* Two category groups */}
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, group) => (
            <section key={group}>
              <div className="skeleton mb-2 ml-1 h-2.5 w-20" />
              <ul className="card divide-y divide-black/5 dark:divide-white/10">
                {Array.from({ length: 4 }).map((_, row) => (
                  <SkeletonRow key={row} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
