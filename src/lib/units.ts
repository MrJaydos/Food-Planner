// Unit handling for ingredient parsing and shopping-list aggregation.
//
// Aggregation rule (per the brief): sum quantities that share a unit; for
// incompatible units list them separately; only auto-convert simple metric
// pairs (g/kg, ml/l). We deliberately do NOT convert e.g. cups <-> ml because
// that needs per-ingredient density.

export type UnitDimension = "mass" | "volume" | "count" | "spoon" | "other";

interface UnitDef {
  canonical: string;
  dimension: UnitDimension;
  // Factor to the dimension's base unit (grams for mass, ml for metric volume).
  // Only defined where auto-conversion is allowed.
  toBase?: number;
}

// Aliases -> canonical unit token.
const UNIT_ALIASES: Record<string, string> = {
  // mass (metric — convertible)
  g: "g",
  gram: "g",
  grams: "g",
  gr: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  kilo: "kg",
  kilos: "kg",
  mg: "mg",
  milligram: "mg",
  milligrams: "mg",
  // mass (imperial — not auto-converted)
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  // volume (metric — convertible)
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  cl: "cl",
  dl: "dl",
  // volume (spoons/cups — not auto-converted)
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tbsp: "tbsp",
  tbs: "tbsp",
  tbl: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cup: "cup",
  cups: "cup",
  "fl oz": "fl oz",
  floz: "fl oz",
  pint: "pint",
  pints: "pint",
  quart: "quart",
  quarts: "quart",
  gallon: "gallon",
  gallons: "gallon",
  // count-ish
  clove: "clove",
  cloves: "clove",
  can: "can",
  cans: "can",
  tin: "can",
  tins: "can",
  pinch: "pinch",
  pinches: "pinch",
  slice: "slice",
  slices: "slice",
  piece: "piece",
  pieces: "piece",
  pkg: "pack",
  pack: "pack",
  packs: "pack",
  package: "pack",
  packet: "pack",
  bunch: "bunch",
  bunches: "bunch",
  handful: "handful",
  sprig: "sprig",
  sprigs: "sprig",
  stalk: "stalk",
  stalks: "stalk",
  head: "head",
  heads: "head",
  dash: "dash",
  dashes: "dash",
};

const UNIT_DEFS: Record<string, UnitDef> = {
  mg: { canonical: "mg", dimension: "mass", toBase: 0.001 },
  g: { canonical: "g", dimension: "mass", toBase: 1 },
  kg: { canonical: "kg", dimension: "mass", toBase: 1000 },
  ml: { canonical: "ml", dimension: "volume", toBase: 1 },
  cl: { canonical: "cl", dimension: "volume", toBase: 10 },
  dl: { canonical: "dl", dimension: "volume", toBase: 100 },
  l: { canonical: "l", dimension: "volume", toBase: 1000 },
};

export function normalizeUnit(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase().replace(/\./g, "");
  if (!key) return null;
  return UNIT_ALIASES[key] ?? key;
}

/**
 * Returns a merge key + normalized quantity for aggregation. Convertible metric
 * units collapse to their base dimension so g and kg (or ml and l) sum together;
 * everything else merges only with the exact same unit token.
 */
export function toMergeKey(
  unit: string | null,
  quantity: number | null,
): { key: string; baseQuantity: number | null; dimension: UnitDimension } {
  const u = normalizeUnit(unit);
  if (!u) {
    return { key: "__none__", baseQuantity: quantity, dimension: "count" };
  }
  const def = UNIT_DEFS[u];
  if (def?.toBase != null && quantity != null) {
    return {
      key: `dim:${def.dimension}`,
      baseQuantity: quantity * def.toBase,
      dimension: def.dimension,
    };
  }
  return { key: `unit:${u}`, baseQuantity: quantity, dimension: "other" };
}

/**
 * Given a summed base quantity for a metric dimension, pick a friendly unit
 * (kg over g past 1000; l over ml past 1000).
 */
export function formatMetric(
  dimension: UnitDimension,
  baseQuantity: number,
): { quantity: number; unit: string } {
  if (dimension === "mass") {
    if (baseQuantity >= 1000) return { quantity: baseQuantity / 1000, unit: "kg" };
    return { quantity: baseQuantity, unit: "g" };
  }
  if (dimension === "volume") {
    if (baseQuantity >= 1000) return { quantity: baseQuantity / 1000, unit: "l" };
    return { quantity: baseQuantity, unit: "ml" };
  }
  return { quantity: baseQuantity, unit: "" };
}

/** Round to at most 2 decimals and drop trailing zeros. */
export function tidyNumber(n: number): number {
  return Math.round(n * 100) / 100;
}
