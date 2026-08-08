import { SkeletonHeader } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonHeader action />
      <div className="space-y-6 p-4">
        <div className="space-y-2">
          <div className="skeleton h-6 w-2/3" />
          <div className="skeleton h-3.5 w-1/3" />
        </div>
        {/* Ingredients, then method */}
        {[5, 3].map((rows, section) => (
          <div key={section} className="space-y-2">
            <div className="skeleton h-3 w-24" />
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="skeleton h-3.5 w-full" />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
