import { tidyNumber } from "./units";

// Render a quantity + unit for display, using common fractions for readability.
const FRACTION_MAP: Array<[number, string]> = [
  [0.25, "¼"],
  [0.33, "⅓"],
  [0.5, "½"],
  [0.66, "⅔"],
  [0.67, "⅔"],
  [0.75, "¾"],
];

export function formatQuantity(
  quantity: number | null | undefined,
  unit?: string | null,
): string {
  if (quantity == null) return unit ? unit : "";
  const q = tidyNumber(quantity);
  let str: string;
  const whole = Math.floor(q);
  const frac = q - whole;
  const match = FRACTION_MAP.find(([v]) => Math.abs(frac - v) < 0.02);
  if (match) {
    str = whole > 0 ? `${whole}${match[1]}` : match[1];
  } else {
    str = String(q);
  }
  return unit ? `${str} ${unit}` : str;
}

export function formatTime(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export const MEAL_TYPE_LABELS: Record<string, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
};

export const CATEGORY_LABELS: Record<string, string> = {
  PRODUCE: "Produce",
  MEAT_SEAFOOD: "Meat & Seafood",
  DAIRY_EGGS: "Dairy & Eggs",
  BAKERY: "Bakery",
  PANTRY: "Pantry",
  FROZEN: "Frozen",
  BEVERAGES: "Beverages",
  SPICES: "Spices",
  CONDIMENTS: "Condiments",
  HOUSEHOLD: "Household",
  OTHER: "Other",
};

// Fixed display order for shopping-list categories (store-walk order).
export const CATEGORY_ORDER: string[] = [
  "PRODUCE",
  "BAKERY",
  "MEAT_SEAFOOD",
  "DAIRY_EGGS",
  "FROZEN",
  "PANTRY",
  "CONDIMENTS",
  "SPICES",
  "BEVERAGES",
  "HOUSEHOLD",
  "OTHER",
];
