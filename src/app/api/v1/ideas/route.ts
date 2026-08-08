import { handler, requireAuth, parseJson, ok, created } from "@/lib/http";
import { listIdeas, createIdea } from "@/lib/ideas";
import { getMembershipId } from "@/lib/context";
import { ideaInputSchema } from "@/lib/validation";

export const runtime = "nodejs";

// GET /api/v1/ideas — every idea in the household, open ones first.
export const GET = handler(async (req) => {
  const auth = await requireAuth(req);
  return ok(await listIdeas(auth.householdId));
});

// POST /api/v1/ideas — jot one down.
export const POST = handler(async (req) => {
  const auth = await requireAuth(req);
  const input = await parseJson(req, ideaInputSchema);
  const membershipId = await getMembershipId(auth);
  const idea = await createIdea(auth.householdId, membershipId, input);
  return created(idea);
});
