import { prisma } from "./prisma";
import { generateInviteCode, hashToken } from "./tokens";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function defaultHouseholdName(email: string): string {
  const local = email.split("@")[0] ?? "My";
  const nice = local.charAt(0).toUpperCase() + local.slice(1);
  return `${nice}'s Household`;
}

/**
 * Resolve the user for a login email, creating the user + a personal household
 * on first sign-in. Returns the user and the household to make active.
 */
export async function findOrCreateUserWithHousehold(email: string): Promise<{
  userId: string;
  householdId: string;
  isNewUser: boolean;
}> {
  const normalized = normalizeEmail(email);

  return prisma.$transaction(async (tx) => {
    let user = await tx.user.findUnique({
      where: { email: normalized },
      include: { memberships: { orderBy: { createdAt: "asc" } } },
    });

    let isNewUser = false;
    if (!user) {
      user = await tx.user.create({
        data: { email: normalized },
        include: { memberships: { orderBy: { createdAt: "asc" } } },
      });
      isNewUser = true;
    }

    if (user.memberships.length === 0) {
      const household = await tx.household.create({
        data: { name: defaultHouseholdName(normalized) },
      });
      await tx.membership.create({
        data: {
          userId: user.id,
          householdId: household.id,
          role: "OWNER",
        },
      });
      return { userId: user.id, householdId: household.id, isNewUser };
    }

    return {
      userId: user.id,
      householdId: user.memberships[0].householdId,
      isNewUser,
    };
  });
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function createInvite(
  householdId: string,
  membershipId: string,
  email?: string | null,
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateInviteCode();
  const invite = await prisma.invite.create({
    data: {
      householdId,
      codeHash: hashToken(code),
      createdById: membershipId,
      email: email ? normalizeEmail(email) : null,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });
  return { code, expiresAt: invite.expiresAt };
}

export interface InvitePreview {
  householdId: string;
  householdName: string;
  invitedByName: string | null;
  invitedByEmail: string;
}

export async function getInvitePreview(
  code: string,
): Promise<InvitePreview | null> {
  const invite = await prisma.invite.findUnique({
    where: { codeHash: hashToken(code) },
    include: {
      household: true,
      createdBy: { include: { user: true } },
    },
  });
  if (!invite) return null;
  if (invite.acceptedAt) return null;
  if (invite.expiresAt.getTime() < Date.now()) return null;
  return {
    householdId: invite.householdId,
    householdName: invite.household.name,
    invitedByName: invite.createdBy.user.name,
    invitedByEmail: invite.createdBy.user.email,
  };
}

export type AcceptInviteResult =
  | { ok: true; householdId: string; alreadyMember: boolean }
  | { ok: false; reason: "invalid" | "expired" | "used" };

/**
 * Accept an invite: add the user to the household (if not already a member) and
 * make that household active. The invite is single-use.
 */
export async function acceptInvite(
  userId: string,
  code: string,
): Promise<AcceptInviteResult> {
  return prisma.$transaction(async (tx) => {
    const invite = await tx.invite.findUnique({
      where: { codeHash: hashToken(code) },
    });
    if (!invite) return { ok: false, reason: "invalid" as const };
    if (invite.acceptedAt) return { ok: false, reason: "used" as const };
    if (invite.expiresAt.getTime() < Date.now())
      return { ok: false, reason: "expired" as const };

    const existing = await tx.membership.findUnique({
      where: {
        userId_householdId: { userId, householdId: invite.householdId },
      },
    });

    if (!existing) {
      await tx.membership.create({
        data: {
          userId,
          householdId: invite.householdId,
          role: "MEMBER",
        },
      });
    }

    await tx.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return {
      ok: true,
      householdId: invite.householdId,
      alreadyMember: Boolean(existing),
    };
  });
}
