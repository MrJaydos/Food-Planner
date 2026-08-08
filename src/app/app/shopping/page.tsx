import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default function ShoppingPlaceholder() {
  return (
    <>
      <PageHeader title="Shopping list" />
      <EmptyState
        title="Shopping list coming soon"
        description="Auto-generated, categorised and check-off-able lists arrive in the shopping-list phase."
      />
    </>
  );
}
