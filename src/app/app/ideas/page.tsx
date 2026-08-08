import { requireContext } from "@/lib/guard";
import { listIdeas } from "@/lib/ideas";
import { IdeasClient } from "./ideas-client";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const ctx = await requireContext("/app/ideas");
  const ideas = await listIdeas(ctx.household.id);

  return (
    <IdeasClient
      initialIdeas={ideas}
      // Only worth naming who jotted something when there's more than one of you.
      showAuthor={ctx.members.length > 1}
    />
  );
}
