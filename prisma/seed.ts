import { PrismaClient } from "@prisma/client";
import { createRecipe } from "../src/lib/recipes";
import { addEntry } from "../src/lib/meal-plans";
import { createIdea } from "../src/lib/ideas";
import { currentWeekStart } from "../src/lib/week";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@foodplanner.local";

async function main() {
  // Reuse the demo user's household if it already exists. Signing in as the
  // demo address (which the README tells you to do) creates the user on its
  // own, so keying "already seeded" off the user would refuse to seed a
  // database that has no recipes in it at all.
  const existing = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { memberships: { select: { householdId: true }, take: 1 } },
  });

  let hid = existing?.memberships[0]?.householdId ?? null;

  if (hid) {
    const recipeCount = await prisma.recipe.count({
      where: { householdId: hid },
    });
    if (recipeCount > 0) {
      console.log("Demo data already seeded — nothing to do.");
      return;
    }
    console.log("Demo user exists but has no recipes — seeding into it.");
  } else {
    const household = await prisma.household.create({
      data: { name: "Demo Kitchen" },
    });
    await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: "Demo Cook",
        memberships: {
          create: { householdId: household.id, role: "OWNER" },
        },
      },
    });
    hid = household.id;
  }

  // --- Sub-recipes first -------------------------------------------------
  const chimichurri = await createRecipe(hid, {
    title: "Chimichurri",
    description: "A bright, garlicky herb sauce.",
    servings: 4,
    prepTimeMinutes: 10,
    tags: ["sauce", "vegan"],
    ingredients: [
      { name: "parsley", quantity: 1, unit: "cup", note: "finely chopped" },
      { name: "garlic", quantity: 3, unit: "clove" },
      { name: "olive oil", quantity: 0.5, unit: "cup" },
      { name: "red wine vinegar", quantity: 2, unit: "tbsp" },
      { name: "chilli flakes", quantity: 1, unit: "tsp" },
    ],
    steps: ["Chop the parsley and garlic finely.", "Stir everything together and season."],
  });

  const guacamole = await createRecipe(hid, {
    title: "Guacamole",
    servings: 4,
    prepTimeMinutes: 10,
    tags: ["dip", "vegan"],
    ingredients: [
      { name: "avocado", quantity: 2 },
      { name: "lime", quantity: 1 },
      { name: "onion", quantity: 0.5, note: "finely diced" },
      { name: "coriander", quantity: 2, unit: "tbsp" },
    ],
    steps: ["Mash the avocado.", "Fold through the lime, onion and coriander."],
  });

  // --- Standalone recipes ------------------------------------------------
  await createRecipe(hid, {
    title: "Overnight Oats",
    description: "Make-ahead breakfast.",
    servings: 1,
    prepTimeMinutes: 5,
    suitableFor: ["BREAKFAST"],
    tags: ["quick", "make-ahead"],
    ingredients: [
      { name: "rolled oats", quantity: 50, unit: "g" },
      { name: "milk", quantity: 120, unit: "ml" },
      { name: "honey", quantity: 1, unit: "tbsp" },
      { name: "blueberries", quantity: 60, unit: "g" },
    ],
    steps: ["Combine and refrigerate overnight."],
  });

  await createRecipe(hid, {
    title: "Chicken Salad",
    servings: 2,
    prepTimeMinutes: 15,
    suitableFor: ["LUNCH"],
    tags: ["healthy"],
    ingredients: [
      { name: "chicken breast", quantity: 2 },
      { name: "lettuce", quantity: 1 },
      { name: "cherry tomatoes", quantity: 200, unit: "g" },
      { name: "cucumber", quantity: 0.5 },
      { name: "olive oil", quantity: 2, unit: "tbsp" },
    ],
    steps: ["Grill the chicken.", "Toss with the salad and dress."],
  });

  const tacos = await createRecipe(hid, {
    title: "Steak Tacos",
    description: "Weeknight favourite with chimichurri and guac.",
    servings: 2,
    prepTimeMinutes: 15,
    cookTimeMinutes: 15,
    suitableFor: ["DINNER"],
    tags: ["mexican"],
    ingredients: [
      { name: "steak", quantity: 400, unit: "g" },
      { name: "tortillas", quantity: 6 },
      { name: "onion", quantity: 1 },
    ],
    components: [
      { childRecipeId: chimichurri, quantityMultiplier: 1 },
      { childRecipeId: guacamole, quantityMultiplier: 0.5 },
    ],
    steps: ["Sear the steak to your liking and rest.", "Warm tortillas, slice steak, build tacos."],
  });

  await createRecipe(hid, {
    title: "Veggie Chickpea Curry",
    servings: 4,
    prepTimeMinutes: 10,
    cookTimeMinutes: 25,
    suitableFor: ["DINNER"],
    tags: ["vegan", "batch"],
    ingredients: [
      { name: "onion", quantity: 1 },
      { name: "garlic", quantity: 2, unit: "clove" },
      { name: "chickpeas", quantity: 400, unit: "g" },
      { name: "coconut milk", quantity: 400, unit: "ml" },
      { name: "curry powder", quantity: 2, unit: "tbsp" },
      { name: "rice", quantity: 300, unit: "g" },
    ],
    steps: ["Soften the onion and garlic.", "Add spices, chickpeas and coconut milk; simmer.", "Serve with rice."],
  });

  // --- A starter plan for this week --------------------------------------
  const week = currentWeekStart();
  await addEntry(hid, week, {
    dayOfWeek: 0,
    mealType: "DINNER",
    kind: "RECIPE",
    recipeId: tacos,
    servingMultiplier: 1,
  });
  await addEntry(hid, week, {
    dayOfWeek: 2,
    mealType: "DINNER",
    kind: "EATING_OUT",
    note: "Date night",
  });

  // --- A couple of jotted ideas ------------------------------------------
  await createIdea(hid, null, {
    text: "Miso aubergine — the one from that place in town",
  });
  await createIdea(hid, null, {
    text: "Proper carbonara, no cream: https://example.com/carbonara",
  });

  console.log("Seeded demo data:");
  console.log("  Household: Demo Kitchen");
  console.log("  6 recipes (incl. Chimichurri & Guacamole as sub-recipes of Steak Tacos)");
  console.log(`  A starter plan for the week of ${week}`);
  console.log("  2 jotted ideas");
  console.log(`\nSign in as ${DEMO_EMAIL} (magic link will be printed to this console in dev).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
