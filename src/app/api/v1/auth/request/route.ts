import { z } from "zod";
import { handler, parseJson, ok, errors, clientIp } from "@/lib/http";
import { rateLimit, maybeSweep } from "@/lib/rate-limit";
import { createMagicLink, sendMagicLinkEmail } from "@/lib/magic-link";
import { isEmailConfigured } from "@/lib/email";
import { normalizeEmail } from "@/lib/accounts";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  redirect: z.string().optional(),
});

const WINDOW_MS = 15 * 60 * 1000;

// POST /api/v1/auth/request — email a single-use magic sign-in link.
export const POST = handler(async (req) => {
  const { email, redirect } = await parseJson(req, schema);
  const normalized = normalizeEmail(email);

  maybeSweep(WINDOW_MS);
  const byEmail = rateLimit(`login:email:${normalized}`, 5, WINDOW_MS);
  const byIp = rateLimit(`login:ip:${clientIp(req)}`, 20, WINDOW_MS);
  if (!byEmail.allowed || !byIp.allowed) {
    const retry = Math.max(byEmail.retryAfterSeconds, byIp.retryAfterSeconds);
    return errors.rateLimited(
      "Too many sign-in attempts. Please try again shortly.",
      retry,
    );
  }

  const { url } = await createMagicLink(normalized, redirect);

  const configured = isEmailConfigured();
  if (configured) {
    try {
      await sendMagicLinkEmail(normalized, url);
    } catch {
      return errors.server("Failed to send the sign-in email. Try again.");
    }
  } else {
    // Dev fallback prints to console (see email.ts).
    await sendMagicLinkEmail(normalized, url).catch(() => {});
  }

  // In non-production without a configured provider, return the link so the UI
  // can offer a "dev sign-in" shortcut.
  const devLink = !configured && !env.isProduction ? url : undefined;

  return ok({
    emailSent: configured,
    message: configured
      ? "Check your email for a sign-in link."
      : "Email isn't configured — use the link from the server console.",
    devLink,
  });
});
