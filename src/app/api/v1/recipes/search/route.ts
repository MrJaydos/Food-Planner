import { handler, requireAuth, ok } from "@/lib/http";
import { searchRecipesForPicker } from "@/lib/recipe-queries";

export const runtime = "nodejs";

// GET /api/v1/recipes/search?q=&exclude=
// Lightweight search used by the sub-recipe picker.
export const GET = handler(async (req) => {
  const auth = await requireAuth(req);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const exclude = url.searchParams.get("exclude") ?? undefined;
  const results = await searchRecipesForPicker(auth.householdId, q, exclude);
  return ok(results);
});
