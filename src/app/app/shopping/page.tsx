import { requireContext } from "@/lib/guard";
import { getShoppingListByWeek } from "@/lib/shopping-queries";
import { currentWeekStart, normalizeWeekStart } from "@/lib/week";
import { ShoppingClient } from "./shopping-client";

export const dynamic = "force-dynamic";

export default async function ShoppingPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const ctx = await requireContext("/app/shopping");
  const { week } = await searchParams;
  const weekStart = (week && normalizeWeekStart(week)) || currentWeekStart();
  const list = await getShoppingListByWeek(ctx.household.id, weekStart);

  return <ShoppingClient weekStart={weekStart} initialList={list} />;
}
