import { z } from "zod";
import { handler, requireAuth, parseJson, ok, errors, clientIp } from "@/lib/http";
import { fetchAndParseRecipe } from "@/lib/recipe-import";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({ url: z.string().url().max(2000) });

// POST /api/v1/recipes/import — fetch a URL and return a parsed preview.
// Does NOT save; the client reviews/edits then POSTs to /api/v1/recipes.
export const POST = handler(async (req) => {
  const auth = await requireAuth(req);
  const { url } = await parseJson(req, schema);

  // Guard against abuse / SSRF-ish loops: throttle per user.
  const rl = rateLimit(`import:${auth.userId}:${clientIp(req)}`, 20, 60_000);
  if (!rl.allowed) {
    return errors.rateLimited("Too many imports. Please wait a moment.", rl.retryAfterSeconds);
  }

  // Block obviously non-public hosts.
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) {
      return errors.badRequest("Only http(s) URLs are supported.");
    }
    if (isPrivateHost(parsed.hostname)) {
      return errors.badRequest("That URL can't be imported.");
    }
  } catch {
    return errors.badRequest("Invalid URL.");
  }

  try {
    const preview = await fetchAndParseRecipe(url);
    return ok(preview);
  } catch {
    return errors.badRequest(
      "Couldn't fetch or read that page. You can still add the recipe manually.",
    );
  }
});

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (/^127\./.test(h) || h === "0.0.0.0" || h === "::1") return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  const m = h.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return true;
  return false;
}
