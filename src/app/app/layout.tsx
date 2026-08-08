import { requireContext } from "@/lib/guard";
import { BottomNav } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard: redirects to /login when unauthenticated.
  await requireContext("/app");

  return (
    <div className="mx-auto min-h-dvh max-w-2xl pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
