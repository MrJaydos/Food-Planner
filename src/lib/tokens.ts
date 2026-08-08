import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Opaque, high-entropy tokens for magic links, sessions and invites. Only the
// SHA-256 hash is ever persisted; the raw token lives only in the URL/cookie.

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

// A short, human-friendlier invite code (still hashed at rest).
export function generateInviteCode(): string {
  return randomBytes(12).toString("base64url");
}
