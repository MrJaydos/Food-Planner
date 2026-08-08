import { SkeletonHeader } from "@/components/skeleton";

// Mirrors the planner's day-column grid so the layout doesn't jump on arrival.
export default function Loading() {
  return (
    <>
      <SkeletonHeader action />
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, day) => (
          <section key={day} className="card space-y-3 p-3">
            <div className="flex items-baseline justify-between">
              <div className="skeleton h-4 w-16" />
              <div className="skeleton h-3 w-10" />
            </div>
            {Array.from({ length: 3 }).map((_, meal) => (
              <div key={meal} className="space-y-1.5">
                <div className="skeleton h-2.5 w-14" />
                <div className="skeleton h-8 w-full rounded-lg" />
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
