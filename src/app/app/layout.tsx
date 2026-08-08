import { requireContext } from "@/lib/guard";
import { AppContainer, BottomNav } from "@/components/app-shell";
import { InstallHint } from "@/components/install-hint";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard: redirects to /login when unauthenticated.
  await requireContext("/app");

  return (
    <AppContainer>
      {children}
      <InstallHint />
      <BottomNav />
    </AppContainer>
  );
}
