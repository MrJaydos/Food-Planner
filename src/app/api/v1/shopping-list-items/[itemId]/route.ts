import { handler, requireAuth, parseJson, ok, errors } from "@/lib/http";
import { updateItem, deleteItem } from "@/lib/shopping-queries";
import { updateItemSchema } from "@/lib/validation";

export const runtime = "nodejs";

// PATCH /api/v1/shopping-list-items/[itemId] — check/uncheck or edit.
export const PATCH = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { itemId } = await ctx.params;
  const patch = await parseJson(req, updateItemSchema);
  try {
    const item = await updateItem(auth.householdId, itemId, patch);
    return ok(item);
  } catch (err) {
    if (err instanceof Error && err.message === "not_found")
      return errors.notFound("Item not found");
    throw err;
  }
});

// DELETE /api/v1/shopping-list-items/[itemId]
export const DELETE = handler(async (req, ctx) => {
  const auth = await requireAuth(req);
  const { itemId } = await ctx.params;
  try {
    await deleteItem(auth.householdId, itemId);
    return ok({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "not_found")
      return errors.notFound("Item not found");
    throw err;
  }
});
