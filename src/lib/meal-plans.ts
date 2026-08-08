import type { MealType, SlotEntryKind, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { addDays, dateOnly, formatDateOnly } from "./week";

const MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER"];

export interface WeekEntryDTO {
  id: string;
  kind: SlotEntryKind;
  sortOrder: number;
  recipeId: string | null;
  recipeTitle: string | null;
  recipeImageUrl: string | null;
  servingMultiplier: number;
  customText: string | null;
  note: string | null;
  assigneeMembershipId: string | null;
  assigneeName: string | null;
}

export interface WeekDayDTO {
  dayOfWeek: number;
  date: string;
  meals: Record<MealType, WeekEntryDTO[]>;
}

export interface WeekPlanDTO {
  weekStart: string;
  planId: string | null;
  title: string | null;
  days: WeekDayDTO[];
  hasEntries: boolean;
}

function memberName(user: { name: string | null; email: string }): string {
  return user.name ?? user.email;
}

const entryInclude = {
  recipe: { select: { id: true, title: true, imageUrl: true } },
  assignee: { include: { user: { select: { name: true, email: true } } } },
} satisfies Prisma.MealSlotEntryInclude;

type EntryWithRels = Prisma.MealSlotEntryGetPayload<{ include: typeof entryInclude }>;

function mapEntry(e: EntryWithRels): WeekEntryDTO {
  return {
    id: e.id,
    kind: e.kind,
    sortOrder: e.sortOrder,
    recipeId: e.recipeId,
    recipeTitle: e.recipe?.title ?? null,
    recipeImageUrl: e.recipe?.imageUrl ?? null,
    servingMultiplier: e.servingMultiplier,
    customText: e.customText,
    note: e.note,
    assigneeMembershipId: e.assigneeMembershipId,
    assigneeName: e.assignee ? memberName(e.assignee.user) : null,
  };
}

function emptyMeals(): Record<MealType, WeekEntryDTO[]> {
  return { BREAKFAST: [], LUNCH: [], DINNER: [] };
}

export async function getWeekPlan(
  householdId: string,
  weekStart: string,
): Promise<WeekPlanDTO> {
  const plan = await prisma.mealPlan.findUnique({
    where: { householdId_weekStart: { householdId, weekStart: dateOnly(weekStart) } },
    include: {
      slots: {
        include: {
          entries: { include: entryInclude, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  const days: WeekDayDTO[] = Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    date: formatDateOnly(addDays(dateOnly(weekStart), i)),
    meals: emptyMeals(),
  }));

  let hasEntries = false;
  if (plan) {
    for (const slot of plan.slots) {
      const day = days[slot.dayOfWeek];
      if (!day) continue;
      const mapped = slot.entries.map(mapEntry);
      if (mapped.length) hasEntries = true;
      day.meals[slot.mealType] = mapped;
    }
  }

  return {
    weekStart,
    planId: plan?.id ?? null,
    title: plan?.title ?? null,
    days,
    hasEntries,
  };
}

async function ensurePlan(
  householdId: string,
  weekStart: string,
): Promise<string> {
  const plan = await prisma.mealPlan.upsert({
    where: { householdId_weekStart: { householdId, weekStart: dateOnly(weekStart) } },
    create: { householdId, weekStart: dateOnly(weekStart) },
    update: {},
    select: { id: true },
  });
  return plan.id;
}

async function ensureSlot(
  planId: string,
  dayOfWeek: number,
  mealType: MealType,
): Promise<string> {
  const slot = await prisma.mealSlot.upsert({
    where: { mealPlanId_dayOfWeek_mealType: { mealPlanId: planId, dayOfWeek, mealType } },
    create: { mealPlanId: planId, dayOfWeek, mealType },
    update: {},
    select: { id: true },
  });
  return slot.id;
}

export interface AddEntryInput {
  dayOfWeek: number;
  mealType: MealType;
  kind: SlotEntryKind;
  recipeId?: string | null;
  servingMultiplier?: number;
  customText?: string | null;
  note?: string | null;
  assigneeMembershipId?: string | null;
}

export async function addEntry(
  householdId: string,
  weekStart: string,
  input: AddEntryInput,
): Promise<WeekEntryDTO> {
  // Validate references belong to the household.
  if (input.kind === "RECIPE") {
    if (!input.recipeId) throw new Error("recipe_required");
    const recipe = await prisma.recipe.findFirst({
      where: { id: input.recipeId, householdId },
      select: { id: true },
    });
    if (!recipe) throw new Error("recipe_not_found");
  }
  if (input.assigneeMembershipId) {
    const m = await prisma.membership.findFirst({
      where: { id: input.assigneeMembershipId, householdId },
      select: { id: true },
    });
    if (!m) throw new Error("assignee_not_found");
  }

  const planId = await ensurePlan(householdId, weekStart);
  const slotId = await ensureSlot(planId, input.dayOfWeek, input.mealType);

  const count = await prisma.mealSlotEntry.count({ where: { mealSlotId: slotId } });
  const entry = await prisma.mealSlotEntry.create({
    data: {
      mealSlotId: slotId,
      kind: input.kind,
      sortOrder: count,
      recipeId: input.kind === "RECIPE" ? input.recipeId : null,
      servingMultiplier: input.servingMultiplier ?? 1,
      customText: input.kind === "CUSTOM" ? (input.customText ?? null) : null,
      note: input.note ?? null,
      assigneeMembershipId: input.assigneeMembershipId ?? null,
    },
    include: entryInclude,
  });
  return mapEntry(entry);
}

export interface UpdateEntryInput {
  servingMultiplier?: number;
  customText?: string | null;
  note?: string | null;
  assigneeMembershipId?: string | null;
}

async function assertEntryOwned(
  householdId: string,
  entryId: string,
): Promise<void> {
  const entry = await prisma.mealSlotEntry.findFirst({
    where: { id: entryId, slot: { mealPlan: { householdId } } },
    select: { id: true },
  });
  if (!entry) throw new Error("not_found");
}

export async function updateEntry(
  householdId: string,
  entryId: string,
  patch: UpdateEntryInput,
): Promise<WeekEntryDTO> {
  await assertEntryOwned(householdId, entryId);
  if (patch.assigneeMembershipId) {
    const m = await prisma.membership.findFirst({
      where: { id: patch.assigneeMembershipId, householdId },
      select: { id: true },
    });
    if (!m) throw new Error("assignee_not_found");
  }
  const entry = await prisma.mealSlotEntry.update({
    where: { id: entryId },
    data: {
      servingMultiplier: patch.servingMultiplier,
      customText: patch.customText,
      note: patch.note,
      assigneeMembershipId:
        patch.assigneeMembershipId === undefined
          ? undefined
          : patch.assigneeMembershipId,
    },
    include: entryInclude,
  });
  return mapEntry(entry);
}

export async function deleteEntry(
  householdId: string,
  entryId: string,
): Promise<void> {
  await assertEntryOwned(householdId, entryId);
  await prisma.mealSlotEntry.delete({ where: { id: entryId } });
}

/** Copy all entries from one week into another (appends to the target). */
export async function copyWeek(
  householdId: string,
  targetWeekStart: string,
  sourceWeekStart: string,
): Promise<number> {
  const source = await prisma.mealPlan.findUnique({
    where: {
      householdId_weekStart: { householdId, weekStart: dateOnly(sourceWeekStart) },
    },
    include: { slots: { include: { entries: true } } },
  });
  if (!source) return 0;

  const targetPlanId = await ensurePlan(householdId, targetWeekStart);
  let copied = 0;

  for (const slot of source.slots) {
    if (slot.entries.length === 0) continue;
    const targetSlotId = await ensureSlot(targetPlanId, slot.dayOfWeek, slot.mealType);
    const base = await prisma.mealSlotEntry.count({
      where: { mealSlotId: targetSlotId },
    });
    let i = 0;
    for (const e of slot.entries) {
      await prisma.mealSlotEntry.create({
        data: {
          mealSlotId: targetSlotId,
          kind: e.kind,
          sortOrder: base + i++,
          recipeId: e.recipeId,
          servingMultiplier: e.servingMultiplier,
          customText: e.customText,
          note: e.note,
          assigneeMembershipId: e.assigneeMembershipId,
        },
      });
      copied++;
    }
  }
  return copied;
}

/** List weeks that already have a plan (for the copy-from picker). */
export async function listPlannedWeeks(
  householdId: string,
  excludeWeekStart?: string,
): Promise<Array<{ weekStart: string; entryCount: number }>> {
  const plans = await prisma.mealPlan.findMany({
    where: { householdId },
    include: { slots: { include: { _count: { select: { entries: true } } } } },
    orderBy: { weekStart: "desc" },
    take: 12,
  });
  return plans
    .map((p) => ({
      weekStart: formatDateOnly(p.weekStart),
      entryCount: p.slots.reduce((sum, s) => sum + s._count.entries, 0),
    }))
    .filter((p) => p.entryCount > 0 && p.weekStart !== excludeWeekStart);
}
