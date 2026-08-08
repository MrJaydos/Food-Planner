import Link from "next/link";
import { requireContext } from "@/lib/guard";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const ctx = await requireContext("/app");
  const firstName = ctx.user.name?.split(" ")[0] ?? null;

  const tiles = [
    {
      href: "/app/planner",
      title: "This week's plan",
      desc: "Plan breakfast, lunch and dinner.",
    },
    {
      href: "/app/recipes",
      title: "Recipes",
      desc: "Your saved and imported recipes.",
    },
    {
      href: "/app/shopping",
      title: "Shopping list",
      desc: "Generated from your week.",
    },
  ];

  return (
    <>
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : "Welcome"}
        subtitle={ctx.household.name}
      />
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card block h-full p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{t.title}</h2>
                <p className="mt-0.5 text-sm text-black/55 dark:text-white/55">
                  {t.desc}
                </p>
              </div>
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-black/30 dark:text-white/30"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
