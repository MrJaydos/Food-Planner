import { requireContext } from "@/lib/guard";
import { PageHeader } from "@/components/page-header";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireContext("/app/settings");
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsClient initial={ctx} />
    </>
  );
}
