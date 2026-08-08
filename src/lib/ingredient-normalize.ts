import type { IngredientCategory } from "@prisma/client";

// --- Name normalization ---------------------------------------------------

const STOPWORD_PREFIXES = [
  "fresh",
  "freshly",
  "dried",
  "ground",
  "chopped",
  "minced",
  "sliced",
  "diced",
  "large",
  "small",
  "medium",
  "ripe",
  "raw",
  "cooked",
  "organic",
  "boneless",
  "skinless",
  "extra",
  "whole",
];

function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("ses") || word.endsWith("xes") || word.endsWith("zes"))
    return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/**
 * Produce a normalized matching key and a tidy display name for an ingredient,
 * so "Onions", "onion" and "large onion" resolve to the same item.
 */
export function normalizeIngredientName(input: string): {
  key: string;
  display: string;
} {
  const cleaned = input
    .toLowerCase()
    .replace(/[.,;:!?"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let words = cleaned.split(" ").filter(Boolean);
  // Drop leading descriptor words (but never drop the whole thing).
  while (words.length > 1 && STOPWORD_PREFIXES.includes(words[0])) {
    words = words.slice(1);
  }
  // Singularize the final (head) noun.
  if (words.length) {
    words[words.length - 1] = singularize(words[words.length - 1]);
  }
  const key = words.join(" ").trim() || cleaned;
  const display = titleCaseFirst(key);
  return { key, display };
}

function titleCaseFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Category inference ----------------------------------------------------

// Keyword -> category. First match wins; checked as whole-word substrings.
const CATEGORY_KEYWORDS: Array<[IngredientCategory, string[]]> = [
  [
    "PRODUCE",
    [
      "onion", "garlic", "tomato", "potato", "carrot", "celery", "pepper",
      "lettuce", "spinach", "kale", "broccoli", "cauliflower", "cucumber",
      "courgette", "zucchini", "aubergine", "eggplant", "mushroom", "lemon",
      "lime", "orange", "apple", "banana", "avocado", "coriander", "cilantro",
      "parsley", "basil", "mint", "ginger", "chilli", "chili", "scallion",
      "spring onion", "leek", "cabbage", "corn", "pea", "bean sprout", "lime",
      "berry", "strawberry", "blueberry", "grape", "mango", "pineapple",
      "cucumber", "radish", "beet", "squash", "pumpkin", "herb", "salad",
      "rocket", "arugula", "shallot", "sweet potato", "green bean",
    ],
  ],
  [
    "MEAT_SEAFOOD",
    [
      "chicken", "beef", "pork", "lamb", "turkey", "bacon", "sausage", "mince",
      "steak", "fish", "salmon", "tuna", "cod", "prawn", "shrimp", "ham",
      "chorizo", "duck", "veal", "anchovy", "crab", "lobster", "scallop",
      "mussel", "fillet", "meatball",
    ],
  ],
  [
    "DAIRY_EGGS",
    [
      "milk", "butter", "cheese", "cream", "yoghurt", "yogurt", "egg",
      "parmesan", "cheddar", "mozzarella", "feta", "ricotta", "mascarpone",
      "creme fraiche", "buttermilk", "ghee",
    ],
  ],
  [
    "BAKERY",
    ["bread", "baguette", "roll", "bun", "tortilla", "pita", "naan", "bagel", "croissant", "wrap"],
  ],
  [
    "FROZEN",
    ["frozen", "ice cream", "ice-cream"],
  ],
  [
    "BEVERAGES",
    ["water", "juice", "wine", "beer", "soda", "cola", "coffee", "tea", "stock", "broth"],
  ],
  [
    "SPICES",
    [
      "salt", "pepper", "cumin", "paprika", "cinnamon", "nutmeg", "turmeric",
      "curry powder", "chilli powder", "chili powder", "cayenne", "oregano",
      "thyme", "rosemary", "bay leaf", "clove", "cardamom", "coriander seed",
      "spice", "seasoning", "vanilla", "saffron", "chinese five spice",
    ],
  ],
  [
    "CONDIMENTS",
    [
      "oil", "vinegar", "soy sauce", "ketchup", "mustard", "mayonnaise", "mayo",
      "honey", "syrup", "jam", "sauce", "paste", "dressing", "sriracha",
      "worcestershire", "fish sauce", "hoisin", "tahini", "pesto", "salsa",
      "chutney", "marmalade",
    ],
  ],
  [
    "PANTRY",
    [
      "flour", "sugar", "rice", "pasta", "noodle", "oat", "lentil", "chickpea",
      "bean", "tin", "can", "tomatoes", "coconut milk", "stock cube", "yeast",
      "baking powder", "baking soda", "cornflour", "cornstarch", "cocoa",
      "chocolate", "nut", "almond", "walnut", "cashew", "raisin", "couscous",
      "quinoa", "breadcrumb", "gelatine", "polenta", "semolina", "tofu",
    ],
  ],
  ["HOUSEHOLD", ["foil", "cling film", "napkin", "bin bag", "kitchen roll"]],
];

export function categorizeIngredient(nameOrKey: string): IngredientCategory {
  const hay = ` ${nameOrKey.toLowerCase()} `;
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    for (const kw of keywords) {
      if (hay.includes(` ${kw} `) || hay.includes(kw)) return category;
    }
  }
  return "OTHER";
}
