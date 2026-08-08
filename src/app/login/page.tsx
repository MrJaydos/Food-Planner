import { Suspense } from "react";
import Link from "next/link";
import { getServerAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect: redirectTo, error } = await searchParams;
  const auth = await getServerAuth();
  if (auth) redirect(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/app");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-10">
      <div className="text-center">
        <Link href="/" className="inline-flex flex-col items-center gap-3">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
            <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" aria-hidden>
              <path
                d="M7 3v7a2 2 0 0 0 2 2v9M9 3v6M5 3v6M17 3c-1.5 1-2 3-2 5s.5 3 2 3v10"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-lg font-semibold">Food Planner</span>
        </Link>
      </div>

      <div className="card p-6">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          We&apos;ll email you a secure sign-in link. No password needed.
        </p>
        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error === "expired"
              ? "That sign-in link has expired or was already used. Request a new one."
              : "Something went wrong with that link. Please try again."}
          </p>
        ) : null}
        <Suspense>
          <LoginForm redirectTo={redirectTo} />
        </Suspense>
      </div>
    </main>
  );
}
