import { prisma } from "./prisma";
import type { AuthContext } from "./auth";

export interface Member {
  membershipId: string;
  role: "OWNER" | "MEMBER";
  userId: string;
  name: string | null;
  email: string;
  isSelf: boolean;
}

export interface CurrentContext {
  user: { id: string; email: string; name: string | null };
  household: { id: string; name: string };
  membership: { id: string; role: "OWNER" | "MEMBER" };
  members: Member[];
}

/**
 * Load the full "current context" for an authenticated user: their profile, the
 * active household, their membership, and all members of that household. This is
 * the canonical shape returned by /api/v1/auth/me and used by server components.
 */
export async function loadCurrentContext(
  auth: AuthContext,
): Promise<CurrentContext | null> {
  const household = await prisma.household.findUnique({
    where: { id: auth.householdId },
    include: {
      memberships: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!household) return null;

  const selfMembership = household.memberships.find(
    (m) => m.userId === auth.userId,
  );
  if (!selfMembership) return null; // user no longer belongs to active household

  return {
    user: auth.user,
    household: { id: household.id, name: household.name },
    membership: { id: selfMembership.id, role: selfMembership.role },
    members: household.memberships.map((m) => ({
      membershipId: m.id,
      role: m.role,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      isSelf: m.userId === auth.userId,
    })),
  };
}

/** Convenience: the current user's membership id within the active household. */
export async function getMembershipId(auth: AuthContext): Promise<string | null> {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_householdId: {
        userId: auth.userId,
        householdId: auth.householdId,
      },
    },
    select: { id: true },
  });
  return membership?.id ?? null;
}
