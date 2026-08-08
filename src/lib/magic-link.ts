import { prisma } from "./prisma";
import { env } from "./env";
import { generateToken, hashToken } from "./tokens";
import { normalizeEmail } from "./accounts";
import { sendEmail } from "./email";

const MAGIC_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function createMagicLink(
  email: string,
  redirect?: string,
): Promise<{ url: string; token: string; expiresAt: Date }> {
  const normalized = normalizeEmail(email);
  const token = generateToken();
  const record = await prisma.magicLinkToken.create({
    data: {
      tokenHash: hashToken(token),
      email: normalized,
      expiresAt: new Date(Date.now() + MAGIC_TTL_MS),
    },
  });

  const params = new URLSearchParams({ token });
  if (redirect && isSafeRedirect(redirect)) params.set("redirect", redirect);
  const url = `${env.appUrl}/api/v1/auth/callback?${params.toString()}`;
  return { url, token, expiresAt: record.expiresAt };
}

/** Consume a magic-link token (single use). Returns the email or null. */
export async function consumeMagicLink(token: string): Promise<string | null> {
  const tokenHash = hashToken(token);
  return prisma.$transaction(async (tx) => {
    const record = await tx.magicLinkToken.findUnique({ where: { tokenHash } });
    if (!record) return null;
    if (record.consumedAt) return null;
    if (record.expiresAt.getTime() < Date.now()) return null;
    await tx.magicLinkToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return record.email;
  });
}

/** Only allow same-origin relative redirects to avoid open-redirect abuse. */
export function isSafeRedirect(target: string): boolean {
  return target.startsWith("/") && !target.startsWith("//");
}

export function buildLoginEmail(url: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Your Food Planner sign-in link";
  const text = [
    "Sign in to Food Planner by opening this link (valid for 15 minutes):",
    "",
    url,
    "",
    "If you didn't request this, you can ignore this email.",
  ].join("\n");
  const html = `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <h1 style="font-size:20px;margin:0 0 8px">Sign in to Food Planner</h1>
    <p style="color:#444;font-size:14px">Tap the button below to sign in. This link is valid for 15 minutes and can only be used once.</p>
    <p style="margin:24px 0">
      <a href="${url}" style="background:#158055;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-size:15px;display:inline-block">Sign in</a>
    </p>
    <p style="color:#888;font-size:12px;word-break:break-all">Or paste this URL into your browser:<br>${url}</p>
    <p style="color:#aaa;font-size:12px;margin-top:24px">If you didn't request this, you can ignore this email.</p>
  </div>`;
  return { subject, html, text };
}

export async function sendMagicLinkEmail(
  email: string,
  url: string,
): Promise<void> {
  const { subject, html, text } = buildLoginEmail(url);
  await sendEmail({ to: normalizeEmail(email), subject, html, text });
}
