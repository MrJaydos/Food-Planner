import { handler, requireAuth, parseJson, created, errors } from "@/lib/http";
import { addManualItem } from "@/lib/shopping-queries";
import { manualItemSchema } from "@/lib/validation";

export const runtime = "nodejs";

// POST /api/v1/shopping-lists/[listId]/items — add a manual item.
export const POST = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { listId } = await ctx.params;
  const input = await parseJson(req, manualItemSchema);
  try {
    const item = await addManualItem(auth.householdId, listId, input);
    return created(item);
  } catch (err) {
    if (err instanceof Error && err.message === "not_found")
      return errors.notFound("Shopping list not found");
    throw err;
  }
});
