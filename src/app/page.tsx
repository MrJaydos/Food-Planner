import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-600 text-white shadow-lg">
        <svg viewBox="0 0 24 24" className="h-11 w-11" fill="none" aria-hidden>
          <path
            d="M7 3v7a2 2 0 0 0 2 2v9M9 3v6M5 3v6M17 3c-1.5 1-2 3-2 5s.5 3 2 3v10"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">Food Planner</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Plan your week, keep your recipes, and shop from an auto-generated
          list.
        </p>
      </div>
      <Link href="/login" className="btn-primary w-full">
        Get started
      </Link>
    </main>
  );
}
