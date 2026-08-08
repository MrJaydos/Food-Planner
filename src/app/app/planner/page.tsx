import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default function PlannerPlaceholder() {
  return (
    <>
      <PageHeader title="Planner" />
      <EmptyState
        title="Weekly planner coming soon"
        description="The week grid, multi-person slots and eating-out markers arrive in the planner phase."
      />
    </>
  );
}
