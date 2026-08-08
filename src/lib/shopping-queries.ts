import type { IngredientCategory } from "@prisma/client";
import { prisma } from "./prisma";
import { dateOnly } from "./week";
import { normalizeUnit } from "./units";

export interface ShoppingItemDTO {
  id: string;
  ingredientId: string | null;
  displayName: string;
  quantity: number | null;
  unit: string | null;
  category: IngredientCategory;
  note: string | null;
  checked: boolean;
  isManual: boolean;
  sortOrder: number;
}

export interface ShoppingListDTO {
  id: string;
  weekStart: string;
  generatedAt: string;
  itemCount: number;
  checkedCount: number;
  items: ShoppingItemDTO[];
}

function mapItem(i: {
  id: string;
  ingredientId: string | null;
  displayName: string;
  quantity: number | null;
  unit: string | null;
  category: IngredientCategory;
  note: string | null;
  checked: boolean;
  isManual: boolean;
  sortOrder: number;
}): ShoppingItemDTO {
  return { ...i };
}

export async function getShoppingListByWeek(
  householdId: string,
  weekStart: string,
): Promise<ShoppingListDTO | null> {
  const list = await prisma.shoppingList.findFirst({
    where: {
      householdId,
      mealPlan: { weekStart: dateOnly(weekStart) },
    },
    include: {
      items: { orderBy: [{ isManual: "asc" }, { sortOrder: "asc" }] },
    },
  });
  if (!list) return null;
  return {
    id: list.id,
    weekStart,
    generatedAt: list.generatedAt.toISOString(),
    itemCount: list.items.length,
    checkedCount: list.items.filter((i) => i.checked).length,
    items: list.items.map(mapItem),
  };
}

async function assertListOwned(householdId: string, listId: string): Promise<void> {
  const list = await prisma.shoppingList.findFirst({
    where: { id: listId, householdId },
    select: { id: true },
  });
  if (!list) throw new Error("not_found");
}

async function assertItemOwned(householdId: string, itemId: string): Promise<void> {
  const item = await prisma.shoppingListItem.findFirst({
    where: { id: itemId, shoppingList: { householdId } },
    select: { id: true },
  });
  if (!item) throw new Error("not_found");
}

export interface ManualItemInput {
  displayName: string;
  quantity?: number | null;
  unit?: string | null;
  category?: IngredientCategory;
}

export async function addManualItem(
  householdId: string,
  listId: string,
  input: ManualItemInput,
): Promise<ShoppingItemDTO> {
  await assertListOwned(householdId, listId);
  const max = await prisma.shoppingListItem.aggregate({
    where: { shoppingListId: listId },
    _max: { sortOrder: true },
  });
  const item = await prisma.shoppingListItem.create({
    data: {
      shoppingListId: listId,
      displayName: input.displayName.trim(),
      quantity: input.quantity ?? null,
      unit: input.unit ? normalizeUnit(input.unit) : null,
      category: input.category ?? "OTHER",
      isManual: true,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
  return mapItem(item);
}

export interface UpdateItemInput {
  checked?: boolean;
  displayName?: string;
  quantity?: number | null;
  unit?: string | null;
  category?: IngredientCategory;
}

export async function updateItem(
  householdId: string,
  itemId: string,
  patch: UpdateItemInput,
): Promise<ShoppingItemDTO> {
  await assertItemOwned(householdId, itemId);
  const item = await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: {
      checked: patch.checked,
      displayName: patch.displayName?.trim(),
      quantity: patch.quantity === undefined ? undefined : patch.quantity,
      unit:
        patch.unit === undefined
          ? undefined
          : patch.unit
            ? normalizeUnit(patch.unit)
            : null,
      category: patch.category,
    },
  });
  return mapItem(item);
}

export async function deleteItem(
  householdId: string,
  itemId: string,
): Promise<void> {
  await assertItemOwned(householdId, itemId);
  await prisma.shoppingListItem.delete({ where: { id: itemId } });
}
