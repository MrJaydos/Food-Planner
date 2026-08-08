import { requireContext } from "@/lib/guard";
import { getWeekPlan } from "@/lib/meal-plans";
import { listRecipes } from "@/lib/recipe-queries";
import { refreshLastUsed } from "@/lib/suggestions";
import { currentWeekStart, normalizeWeekStart } from "@/lib/week";
import { PlannerClient, type PlannerRecipe, type PlannerMember } from "./planner-client";

export const dynamic = "force-dynamic";

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const ctx = await requireContext("/app/planner");
  const { week } = await searchParams;
  const weekStart = (week && normalizeWeekStart(week)) || currentWeekStart();

  // Keep lastUsedAt fresh so "haven't had in a while" ordering is accurate.
  await refreshLastUsed(ctx.household.id);

  const [plan, recipes] = await Promise.all([
    getWeekPlan(ctx.household.id, weekStart),
    listRecipes(ctx.household.id),
  ]);

  const plannerRecipes: PlannerRecipe[] = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    imageUrl: r.imageUrl,
    suitableFor: r.suitableFor,
    servings: r.servings,
    lastUsedAt: r.lastUsedAt,
  }));
  const members: PlannerMember[] = ctx.members.map((m) => ({
    membershipId: m.membershipId,
    name: m.name ?? m.email,
  }));

  return (
    <PlannerClient
      weekStart={weekStart}
      initialPlan={plan}
      recipes={plannerRecipes}
      members={members}
    />
  );
}
