import { handler, requireAuth, ok } from "@/lib/http";
import { listPlannedWeeks } from "@/lib/meal-plans";

export const runtime = "nodejs";

// GET /api/v1/meal-plans?exclude=YYYY-MM-DD — planned weeks (for copy picker).
export const GET = handler(async (req) => {
  const auth = await requireAuth(req);
  const url = new URL(req.url);
  const exclude = url.searchParams.get("exclude") ?? undefined;
  const weeks = await listPlannedWeeks(auth.householdId, exclude);
  return ok(weeks);
});
