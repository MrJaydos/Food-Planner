import Link from "next/link";
import { getServerAuth } from "@/lib/auth";
import { getInvitePreview } from "@/lib/accounts";
import { AcceptInvite } from "./accept-invite";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const preview = await getInvitePreview(code);
  const auth = await getServerAuth();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div className="card p-6 text-center">
        {!preview ? (
          <>
            <h1 className="text-xl font-semibold">Invite not found</h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              This invite link is invalid, expired, or has already been used.
            </p>
            <Link href="/" className="btn-secondary mt-6 w-full">
              Go home
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM19 8v6M22 11h-6" />
              </svg>
            </div>
            <h1 className="mt-4 text-xl font-semibold">
              Join {preview.householdName}
            </h1>
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              {preview.invitedByName ?? preview.invitedByEmail} invited you to
              share recipes, meal plans and shopping lists.
            </p>

            {auth ? (
              <AcceptInvite code={code} />
            ) : (
              <Link
                href={`/login?redirect=${encodeURIComponent(`/invite/${code}`)}`}
                className="btn-primary mt-6 w-full"
              >
                Sign in to accept
              </Link>
            )}
          </>
        )}
      </div>
    </main>
  );
}
