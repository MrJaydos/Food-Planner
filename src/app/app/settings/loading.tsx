import { SkeletonHeader, SkeletonCard } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <div className="space-y-6 p-4">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    </>
  );
}
