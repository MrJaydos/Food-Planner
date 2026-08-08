import { normalizeUnit } from "./units";

export interface ParsedIngredient {
  quantity: number | null;
  unit: string | null;
  name: string;
  note: string | null;
  rawText: string;
}

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2",
  "⅓": "1/3",
  "⅔": "2/3",
  "¼": "1/4",
  "¾": "3/4",
  "⅕": "1/5",
  "⅖": "2/5",
  "⅗": "3/5",
  "⅘": "4/5",
  "⅙": "1/6",
  "⅚": "5/6",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
  "⅐": "1/7",
  "⅑": "1/9",
  "⅒": "1/10",
};

function expandUnicodeFractions(input: string): string {
  let out = "";
  for (const ch of input) {
    if (UNICODE_FRACTIONS[ch]) {
      // Ensure a separating space so "1½" becomes "1 1/2".
      if (out.length && /\d$/.test(out)) out += " ";
      out += UNICODE_FRACTIONS[ch];
    } else {
      out += ch;
    }
  }
  return out;
}

function parseFraction(token: string): number | null {
  const m = token.match(/^(\d+)\/(\d+)$/);
  if (!m) return null;
  const denom = Number(m[2]);
  if (denom === 0) return null;
  return Number(m[1]) / denom;
}

function parseNumberToken(token: string): number | null {
  if (/^\d+\/\d+$/.test(token)) return parseFraction(token);
  if (/^\d*\.\d+$/.test(token) || /^\d+$/.test(token)) return Number(token);
  return null;
}

/**
 * Parse a leading quantity from tokens. Supports: whole numbers, decimals,
 * fractions (1/2), mixed numbers (2 1/2), and ranges (1-2 / 1 to 2 — averaged).
 * Returns the numeric quantity and the number of tokens consumed.
 */
function parseLeadingQuantity(tokens: string[]): {
  quantity: number | null;
  consumed: number;
} {
  if (tokens.length === 0) return { quantity: null, consumed: 0 };

  // Range like "1-2" or "1–2".
  const rangeMatch = tokens[0].match(/^(\d*\.?\d+)[-–](\d*\.?\d+)$/);
  if (rangeMatch) {
    const avg = (Number(rangeMatch[1]) + Number(rangeMatch[2])) / 2;
    return { quantity: avg, consumed: 1 };
  }

  const first = parseNumberToken(tokens[0]);
  if (first == null) return { quantity: null, consumed: 0 };

  // "1 to 2"
  if (
    tokens[1]?.toLowerCase() === "to" &&
    parseNumberToken(tokens[2] ?? "") != null
  ) {
    const second = parseNumberToken(tokens[2])!;
    return { quantity: (first + second) / 2, consumed: 3 };
  }

  // Mixed number "2 1/2" (whole followed by a fraction).
  if (Number.isInteger(first) && /^\d+\/\d+$/.test(tokens[1] ?? "")) {
    const frac = parseFraction(tokens[1])!;
    return { quantity: first + frac, consumed: 2 };
  }

  return { quantity: first, consumed: 1 };
}

// Descriptive words that are notes rather than part of the ingredient name.
const NOTE_LEADING = /^(finely |roughly |freshly |thinly |coarsely )/i;

/**
 * Parse a single ingredient line into structured parts, always preserving the
 * raw text as a fallback.
 */
export function parseIngredientLine(raw: string): ParsedIngredient {
  const rawText = raw.trim();
  const base: ParsedIngredient = {
    quantity: null,
    unit: null,
    name: rawText,
    note: null,
    rawText,
  };
  if (!rawText) return { ...base, name: "" };

  // Pull a trailing/inline note in parentheses out first.
  let working = expandUnicodeFractions(rawText);
  let note: string | null = null;
  const paren = working.match(/\(([^)]*)\)/);
  if (paren) {
    note = paren[1].trim();
    working = working.replace(paren[0], " ").replace(/\s+/g, " ").trim();
  }

  // A comma usually separates name from preparation note ("onion, diced").
  const commaIdx = working.indexOf(",");
  if (commaIdx !== -1) {
    const after = working.slice(commaIdx + 1).trim();
    note = note ? `${note}; ${after}` : after;
    working = working.slice(0, commaIdx).trim();
  }

  const tokens = working.split(/\s+/).filter(Boolean);
  // Split a leading glued quantity+unit like "400g" or "1/2cup" into two tokens.
  if (tokens.length) {
    const glued = tokens[0].match(/^(\d+(?:\.\d+)?(?:\/\d+)?)([a-zA-Z]+)$/);
    if (glued && KNOWN_UNIT(normalizeUnit(glued[2]) ?? glued[2])) {
      tokens.splice(0, 1, glued[1], glued[2]);
    }
  }
  const { quantity, consumed } = parseLeadingQuantity(tokens);
  let rest = tokens.slice(consumed);

  // Optional unit immediately after the quantity.
  let unit: string | null = null;
  if (rest.length) {
    // Try a two-word unit first ("fl oz").
    const twoWord = `${rest[0]} ${rest[1] ?? ""}`.trim().toLowerCase();
    const two = normalizeUnit(twoWord);
    const oneRaw = rest[0].toLowerCase().replace(/\.$/, "");
    const one = normalizeUnit(oneRaw);
    if (rest.length >= 2 && two && two !== twoWord && KNOWN_UNIT(two)) {
      unit = two;
      rest = rest.slice(2);
    } else if (quantity != null && one && KNOWN_UNIT(one)) {
      unit = one;
      rest = rest.slice(1);
    }
  }

  // Strip a leading "of" ("cup of flour" -> "flour").
  if (rest[0]?.toLowerCase() === "of") rest = rest.slice(1);

  let name = rest.join(" ").trim();

  // Move a leading descriptor into the note.
  const desc = name.match(NOTE_LEADING);
  if (desc) {
    const word = desc[0].trim();
    name = name.slice(desc[0].length).trim();
    note = note ? `${word}; ${note}` : word;
  }

  if (!name) name = working; // fallback: keep original words

  return {
    quantity: quantity == null ? null : round3(quantity),
    unit,
    name: name.replace(/\s+/g, " ").trim(),
    note: note && note.length ? note : null,
    rawText,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// Only treat a token as a unit if it's a recognised unit alias (normalizeUnit
// returns the input unchanged for unknown tokens, so compare against a set).
const RECOGNISED_UNITS = new Set(
  [
    "mg", "g", "kg", "oz", "lb", "ml", "cl", "dl", "l", "tsp", "tbsp", "cup",
    "fl oz", "pint", "quart", "gallon", "clove", "can", "pinch", "slice",
    "piece", "pack", "bunch", "handful", "sprig", "stalk", "head", "dash",
  ],
);
function KNOWN_UNIT(u: string): boolean {
  return RECOGNISED_UNITS.has(u);
}

export function parseIngredientLines(text: string): ParsedIngredient[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseIngredientLine);
}
