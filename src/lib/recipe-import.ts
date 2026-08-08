import * as cheerio from "cheerio";
import { parseIngredientLine, type ParsedIngredient } from "./ingredient-parse";

export interface RecipeImportPreview {
  title: string;
  description: string | null;
  imageUrl: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  steps: string[];
  tags: string[];
  ingredients: ParsedIngredient[];
  sourceUrl: string;
  matched: boolean; // whether structured data was found
}

// Parse an ISO-8601 duration (e.g. "PT1H30M") to minutes.
export function parseIsoDuration(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const m = value.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );
  if (!m) return null;
  const days = Number(m[1] ?? 0);
  const hours = Number(m[2] ?? 0);
  const mins = Number(m[3] ?? 0);
  const secs = Number(m[4] ?? 0);
  const total = days * 1440 + hours * 60 + mins + Math.round(secs / 60);
  return total > 0 ? total : null;
}

function firstString(v: unknown): string | null {
  if (typeof v === "string") return v.trim() || null;
  if (Array.isArray(v)) {
    for (const item of v) {
      const s = firstString(item);
      if (s) return s;
    }
  }
  if (v && typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.name === "string") return obj.name;
  }
  return null;
}

function parseServings(v: unknown): number | null {
  const s = firstString(v);
  if (!s) return null;
  const m = s.match(/\d+/);
  return m ? Number(m[0]) : null;
}

function parseInstructions(v: unknown): string[] {
  const steps: string[] = [];
  const walk = (node: unknown) => {
    if (!node) return;
    if (typeof node === "string") {
      // Could be a blob of HTML or newline-separated text.
      const text = node.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text) {
        for (const part of text.split(/\n+/)) {
          const t = part.trim();
          if (t) steps.push(t);
        }
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      // HowToSection with itemListElement, or HowToStep with text.
      if (obj.itemListElement) {
        walk(obj.itemListElement);
        return;
      }
      const text = firstString(obj.text ?? obj.name);
      if (text) steps.push(text.replace(/\s+/g, " ").trim());
    }
  };
  walk(v);
  return steps.filter(Boolean);
}

function parseTags(v: unknown): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    for (const part of s.split(",")) {
      const t = part.trim().toLowerCase();
      if (t) out.add(t);
    }
  };
  if (typeof v === "string") add(v);
  else if (Array.isArray(v))
    for (const item of v) if (typeof item === "string") add(item);
  return [...out].slice(0, 20);
}

function isRecipeNode(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== "object") return false;
  const type = (node as Record<string, unknown>)["@type"];
  if (typeof type === "string") return type.toLowerCase().includes("recipe");
  if (Array.isArray(type))
    return type.some(
      (t) => typeof t === "string" && t.toLowerCase().includes("recipe"),
    );
  return false;
}

function findRecipeNode(json: unknown): Record<string, unknown> | null {
  if (!json) return null;
  if (Array.isArray(json)) {
    for (const item of json) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof json === "object") {
    if (isRecipeNode(json)) return json as Record<string, unknown>;
    const graph = (json as Record<string, unknown>)["@graph"];
    if (graph) return findRecipeNode(graph);
  }
  return null;
}

function fromRecipeNode(
  node: Record<string, unknown>,
  sourceUrl: string,
): RecipeImportPreview {
  const ingredientStrings = Array.isArray(node.recipeIngredient)
    ? (node.recipeIngredient as unknown[]).filter(
        (x): x is string => typeof x === "string",
      )
    : [];
  return {
    title: firstString(node.name) ?? "Imported recipe",
    description: firstString(node.description),
    imageUrl: firstString(node.image),
    servings: parseServings(node.recipeYield),
    prepTimeMinutes: parseIsoDuration(node.prepTime),
    cookTimeMinutes:
      parseIsoDuration(node.cookTime) ?? parseIsoDuration(node.totalTime),
    steps: parseInstructions(node.recipeInstructions),
    tags: parseTags(node.keywords ?? node.recipeCategory ?? node.recipeCuisine),
    ingredients: ingredientStrings.map(parseIngredientLine),
    sourceUrl,
    matched: true,
  };
}

// Fallback: common HTML patterns (microdata / class names) when no JSON-LD.
function fromHtmlHeuristics(
  $: cheerio.CheerioAPI,
  sourceUrl: string,
): RecipeImportPreview {
  const title =
    $('[itemprop="name"]').first().text().trim() ||
    $("h1").first().text().trim() ||
    $("title").first().text().trim() ||
    "Imported recipe";

  const ingredients: ParsedIngredient[] = [];
  $(
    '[itemprop="recipeIngredient"], [itemprop="ingredients"], li.ingredient, .ingredient',
  ).each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) ingredients.push(parseIngredientLine(text));
  });

  const steps: string[] = [];
  $('[itemprop="recipeInstructions"] li, .instructions li, .directions li').each(
    (_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text) steps.push(text);
    },
  );

  const image =
    $('meta[property="og:image"]').attr("content") ??
    $('[itemprop="image"]').attr("src") ??
    null;
  const description =
    $('meta[name="description"]').attr("content")?.trim() ??
    $('meta[property="og:description"]').attr("content")?.trim() ??
    null;

  return {
    title,
    description,
    imageUrl: image,
    servings: null,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    steps,
    tags: [],
    ingredients,
    sourceUrl,
    matched: ingredients.length > 0,
  };
}

/** Pure parser: extract a recipe preview from HTML. */
export function parseRecipeHtml(
  html: string,
  sourceUrl: string,
): RecipeImportPreview {
  const $ = cheerio.load(html);

  for (const el of $('script[type="application/ld+json"]').toArray()) {
    const raw = $(el).contents().text();
    if (!raw.trim()) continue;
    try {
      const json = JSON.parse(raw);
      const node = findRecipeNode(json);
      if (node) return fromRecipeNode(node, sourceUrl);
    } catch {
      // Some sites embed multiple/invalid JSON — skip and continue.
    }
  }

  return fromHtmlHeuristics($, sourceUrl);
}

const MAX_BYTES = 3_000_000;

/** Fetch a URL and parse it into a recipe preview. */
export async function fetchAndParseRecipe(
  url: string,
): Promise<RecipeImportPreview> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  // Respect an outbound proxy if configured (dev/self-hosted behind egress).
  let dispatcher: unknown;
  const proxy =
    process.env.HTTPS_PROXY ?? process.env.https_proxy ?? undefined;
  if (proxy) {
    try {
      const { ProxyAgent } = await import("undici");
      dispatcher = new ProxyAgent(proxy);
    } catch {
      /* undici always present in Node 22, but be defensive */
    }
  }

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; FoodPlanner/1.0; +recipe-import)",
        accept: "text/html,application/xhtml+xml",
      },
      // @ts-expect-error undici dispatcher option is not in the DOM types
      dispatcher,
    });
    if (!res.ok) {
      throw new Error(`Fetch failed with status ${res.status}`);
    }
    const reader = res.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.length;
          chunks.push(value);
          if (received > MAX_BYTES) {
            controller.abort();
            break;
          }
        }
      }
    }
    const html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString(
      "utf-8",
    );
    return parseRecipeHtml(html, url);
  } finally {
    clearTimeout(timeout);
  }
}
