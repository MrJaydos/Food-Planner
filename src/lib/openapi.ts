import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  recipeInputSchema,
  addEntrySchema,
  updateEntrySchema,
  copyWeekSchema,
  manualItemSchema,
  updateItemSchema,
} from "./validation";
import type * as Api from "./api-types";

/**
 * OpenAPI 3.1 description of the /api/v1 surface, so a native client can be
 * generated later rather than hand-written.
 *
 * Request bodies reuse the very Zod schemas the routes validate with, so they
 * are correct by construction. Responses are mirrored as Zod schemas here and
 * pinned to the TypeScript DTOs by the `Assert<Equal<...>>` lines below — if a
 * DTO changes and its schema doesn't, `npm run typecheck` fails. That is what
 * stops this document rotting into a lie.
 */

// --- Compile-time equality check -----------------------------------------

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;

// --- Shared enums ---------------------------------------------------------

const mealType = z.enum(["BREAKFAST", "LUNCH", "DINNER"]);
const slotEntryKind = z.enum(["RECIPE", "CUSTOM", "EATING_OUT"]);
const householdRole = z.enum(["OWNER", "MEMBER"]);
const ingredientCategory = z.enum([
  "PRODUCE",
  "MEAT_SEAFOOD",
  "DAIRY_EGGS",
  "BAKERY",
  "PANTRY",
  "FROZEN",
  "BEVERAGES",
  "SPICES",
  "CONDIMENTS",
  "HOUSEHOLD",
  "OTHER",
]);

type _MealType = Assert<Equal<z.infer<typeof mealType>, Api.MealType>>;
type _SlotKind = Assert<Equal<z.infer<typeof slotEntryKind>, Api.SlotEntryKind>>;
type _Role = Assert<Equal<z.infer<typeof householdRole>, Api.HouseholdRole>>;
type _Category = Assert<
  Equal<z.infer<typeof ingredientCategory>, Api.IngredientCategory>
>;

// --- Auth & household -----------------------------------------------------

const member = z.object({
  membershipId: z.string(),
  role: householdRole,
  userId: z.string(),
  name: z.string().nullable(),
  email: z.string(),
  isSelf: z.boolean(),
});
type _Member = Assert<Equal<z.infer<typeof member>, Api.Member>>;

const currentContext = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
  }),
  household: z.object({ id: z.string(), name: z.string() }),
  membership: z.object({ id: z.string(), role: householdRole }),
  members: z.array(member),
});
type _Context = Assert<Equal<z.infer<typeof currentContext>, Api.CurrentContext>>;

const authRequestResult = z.object({
  emailSent: z.boolean(),
  message: z.string(),
  devLink: z.string().optional(),
});
type _AuthReq = Assert<
  Equal<z.infer<typeof authRequestResult>, Api.AuthRequestResult>
>;

const authVerifyResult = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
  }),
  householdId: z.string(),
});
type _AuthVerify = Assert<
  Equal<z.infer<typeof authVerifyResult>, Api.AuthVerifyResult>
>;

const invitePreview = z.object({
  householdId: z.string(),
  householdName: z.string(),
  invitedByName: z.string().nullable(),
  invitedByEmail: z.string(),
});
type _InvitePreview = Assert<
  Equal<z.infer<typeof invitePreview>, Api.InvitePreview>
>;

const inviteCreated = z.object({
  code: z.string(),
  url: z.string(),
  expiresAt: z.string(),
});
type _InviteCreated = Assert<
  Equal<z.infer<typeof inviteCreated>, Api.InviteCreated>
>;

// --- Recipes --------------------------------------------------------------

const recipeListItem = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  servings: z.number().nullable(),
  prepTimeMinutes: z.number().nullable(),
  cookTimeMinutes: z.number().nullable(),
  tags: z.array(z.string()),
  suitableFor: z.array(mealType),
  lastUsedAt: z.string().nullable(),
  ingredientCount: z.number(),
  componentCount: z.number(),
});
type _RecipeListItem = Assert<
  Equal<z.infer<typeof recipeListItem>, Api.RecipeListItem>
>;

const recipeIngredient = z.object({
  id: z.string(),
  ingredientId: z.string(),
  name: z.string(),
  category: ingredientCategory,
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  note: z.string().nullable(),
  rawText: z.string().nullable(),
});
type _RecipeIngredient = Assert<
  Equal<z.infer<typeof recipeIngredient>, Api.RecipeIngredientDTO>
>;

const recipeComponentChild = z.object({
  id: z.string(),
  title: z.string(),
  imageUrl: z.string().nullable(),
  ingredients: z.array(recipeIngredient),
  steps: z.array(z.string()),
});
type _RecipeChild = Assert<
  Equal<z.infer<typeof recipeComponentChild>, Api.RecipeComponentChildDTO>
>;

const recipeComponent = z.object({
  id: z.string(),
  quantityMultiplier: z.number(),
  note: z.string().nullable(),
  child: recipeComponentChild,
});
type _RecipeComponent = Assert<
  Equal<z.infer<typeof recipeComponent>, Api.RecipeComponentDTO>
>;

const recipeDetail = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  servings: z.number().nullable(),
  prepTimeMinutes: z.number().nullable(),
  cookTimeMinutes: z.number().nullable(),
  steps: z.array(z.string()),
  tags: z.array(z.string()),
  suitableFor: z.array(mealType),
  lastUsedAt: z.string().nullable(),
  ingredients: z.array(recipeIngredient),
  components: z.array(recipeComponent),
});
type _RecipeDetail = Assert<
  Equal<z.infer<typeof recipeDetail>, Api.RecipeDetail>
>;

const recipeSearchHit = z.object({ id: z.string(), title: z.string() });
type _SearchHit = Assert<
  Equal<z.infer<typeof recipeSearchHit>, Api.RecipeSearchHit>
>;

const parsedIngredient = z.object({
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  name: z.string(),
  note: z.string().nullable(),
  rawText: z.string(),
});
type _ParsedIngredient = Assert<
  Equal<z.infer<typeof parsedIngredient>, Api.ParsedIngredient>
>;

const recipeImportPreview = z.object({
  title: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  servings: z.number().nullable(),
  prepTimeMinutes: z.number().nullable(),
  cookTimeMinutes: z.number().nullable(),
  steps: z.array(z.string()),
  tags: z.array(z.string()),
  ingredients: z.array(parsedIngredient),
  sourceUrl: z.string(),
  matched: z.boolean(),
});
type _ImportPreview = Assert<
  Equal<z.infer<typeof recipeImportPreview>, Api.RecipeImportPreview>
>;

// --- Meal plans -----------------------------------------------------------

const weekEntry = z.object({
  id: z.string(),
  kind: slotEntryKind,
  sortOrder: z.number(),
  recipeId: z.string().nullable(),
  recipeTitle: z.string().nullable(),
  recipeImageUrl: z.string().nullable(),
  servingMultiplier: z.number(),
  customText: z.string().nullable(),
  note: z.string().nullable(),
  assigneeMembershipId: z.string().nullable(),
  assigneeName: z.string().nullable(),
});
type _WeekEntry = Assert<Equal<z.infer<typeof weekEntry>, Api.WeekEntryDTO>>;

const weekDay = z.object({
  dayOfWeek: z.number(),
  date: z.string(),
  meals: z.object({
    BREAKFAST: z.array(weekEntry),
    LUNCH: z.array(weekEntry),
    DINNER: z.array(weekEntry),
  }),
});
type _WeekDay = Assert<Equal<z.infer<typeof weekDay>, Api.WeekDayDTO>>;

const weekPlan = z.object({
  weekStart: z.string(),
  planId: z.string().nullable(),
  title: z.string().nullable(),
  days: z.array(weekDay),
  hasEntries: z.boolean(),
});
type _WeekPlan = Assert<Equal<z.infer<typeof weekPlan>, Api.WeekPlanDTO>>;

const weekSummary = z.object({
  weekStart: z.string(),
  entryCount: z.number(),
});
type _WeekSummary = Assert<Equal<z.infer<typeof weekSummary>, Api.WeekSummary>>;

const copyWeekResult = z.object({ copied: z.number() });
type _CopyWeek = Assert<
  Equal<z.infer<typeof copyWeekResult>, Api.CopyWeekResult>
>;

// --- Shopping list --------------------------------------------------------

const shoppingItem = z.object({
  id: z.string(),
  ingredientId: z.string().nullable(),
  displayName: z.string(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  category: ingredientCategory,
  note: z.string().nullable(),
  checked: z.boolean(),
  isManual: z.boolean(),
  sortOrder: z.number(),
});
type _ShoppingItem = Assert<
  Equal<z.infer<typeof shoppingItem>, Api.ShoppingItemDTO>
>;

const shoppingList = z.object({
  id: z.string(),
  weekStart: z.string(),
  generatedAt: z.string(),
  itemCount: z.number(),
  checkedCount: z.number(),
  items: z.array(shoppingItem),
});
type _ShoppingList = Assert<
  Equal<z.infer<typeof shoppingList>, Api.ShoppingListDTO>
>;

// --- Suggestions ----------------------------------------------------------

const surpriseResult = z.object({
  id: z.string(),
  title: z.string(),
  imageUrl: z.string().nullable(),
  lastUsedAt: z.string().nullable(),
  suitableFor: z.array(mealType),
});
type _Surprise = Assert<
  Equal<z.infer<typeof surpriseResult>, Api.SurpriseResult>
>;

const overlapSuggestion = z.object({
  id: z.string(),
  title: z.string(),
  imageUrl: z.string().nullable(),
  suitableFor: z.array(mealType),
  lastUsedAt: z.string().nullable(),
  sharedIngredients: z.array(z.string()),
  reason: z.string(),
  score: z.number(),
});
type _Overlap = Assert<
  Equal<z.infer<typeof overlapSuggestion>, Api.OverlapSuggestion>
>;

// --- Misc -----------------------------------------------------------------

const healthStatus = z.object({
  status: z.enum(["ok", "degraded"]),
  database: z.boolean(),
  uptime: z.number(),
  latencyMs: z.number(),
  timestamp: z.string(),
});
type _Health = Assert<Equal<z.infer<typeof healthStatus>, Api.HealthStatus>>;

const uploadResult = z.object({ url: z.string() });
type _Upload = Assert<Equal<z.infer<typeof uploadResult>, Api.UploadResult>>;

const okResult = z.object({ ok: z.literal(true) });
type _Ok = Assert<Equal<z.infer<typeof okResult>, Api.OkResult>>;

// --- Document assembly ----------------------------------------------------

const schemas = {
  Member: member,
  CurrentContext: currentContext,
  AuthRequestResult: authRequestResult,
  AuthVerifyResult: authVerifyResult,
  InvitePreview: invitePreview,
  InviteCreated: inviteCreated,
  RecipeListItem: recipeListItem,
  RecipeIngredient: recipeIngredient,
  RecipeComponentChild: recipeComponentChild,
  RecipeComponent: recipeComponent,
  RecipeDetail: recipeDetail,
  RecipeSearchHit: recipeSearchHit,
  ParsedIngredient: parsedIngredient,
  RecipeImportPreview: recipeImportPreview,
  WeekEntry: weekEntry,
  WeekDay: weekDay,
  WeekPlan: weekPlan,
  WeekSummary: weekSummary,
  CopyWeekResult: copyWeekResult,
  ShoppingItem: shoppingItem,
  ShoppingList: shoppingList,
  SurpriseResult: surpriseResult,
  OverlapSuggestion: overlapSuggestion,
  HealthStatus: healthStatus,
  UploadResult: uploadResult,
  OkResult: okResult,
  // Request bodies — the same schemas the routes validate against.
  RecipeInput: recipeInputSchema,
  AddEntryInput: addEntrySchema,
  UpdateEntryInput: updateEntrySchema,
  CopyWeekInput: copyWeekSchema,
  ManualItemInput: manualItemSchema,
  UpdateItemInput: updateItemSchema,
} as const;

type SchemaName = keyof typeof schemas;

const ref = (name: SchemaName) => ({
  $ref: `#/components/schemas/${name}`,
});

/** `{ data: <schema> }`, the shape every success response takes. */
function okResponse(description: string, schema: object) {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: { data: schema },
          required: ["data"],
        },
      },
    },
  };
}

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: ref("Error" as SchemaName) } },
});

const arrayOf = (name: SchemaName) => ({ type: "array", items: ref(name) });

const weekStartParam = {
  name: "weekStart",
  in: "path",
  required: true,
  description: "Monday of the target week, YYYY-MM-DD.",
  schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
};

const idParam = (name: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string" },
});

const jsonBody = (name: SchemaName) => ({
  required: true,
  content: { "application/json": { schema: ref(name) } },
});

const common = {
  400: errorResponse("Validation failed"),
  401: errorResponse("Not authenticated"),
  404: errorResponse("Not found"),
};

/**
 * Derive a stable `operationId` for every operation that lacks one.
 *
 * Client generators name their methods from these, so they need to exist and
 * be unique. Deriving them from method + path keeps them in step with the
 * routes automatically instead of drifting from a hand-maintained list.
 */
function addOperationIds(paths: Record<string, Record<string, unknown>>): void {
  const seen = new Set<string>();
  for (const [path, item] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(item)) {
      if (!operation || typeof operation !== "object") continue;
      const op = operation as { operationId?: string };
      if (op.operationId) continue;

      const words = path
        .split("/")
        .filter(Boolean)
        .map((segment) =>
          segment.startsWith("{")
            ? `by-${segment.slice(1, -1)}`
            : segment.replace(/\.json$/, ""),
        )
        .join("-");

      const camel = `${method}-${words}`
        .split(/[-_]/)
        .filter(Boolean)
        .map((w, i) => (i === 0 ? w : w[0].toUpperCase() + w.slice(1)))
        .join("");

      let id = camel;
      let n = 2;
      while (seen.has(id)) id = `${camel}${n++}`;
      seen.add(id);
      op.operationId = id;
    }
  }
}

export function buildOpenApiDocument() {
  const componentSchemas: Record<string, unknown> = {
    Error: {
      type: "object",
      properties: {
        error: {
          type: "object",
          properties: {
            code: {
              type: "string",
              enum: [
                "unauthorized",
                "forbidden",
                "not_found",
                "bad_request",
                "conflict",
                "rate_limited",
                "server_error",
              ],
            },
            message: { type: "string" },
            details: {},
          },
          required: ["code", "message"],
        },
      },
      required: ["error"],
    },
  };

  for (const [name, schema] of Object.entries(schemas)) {
    // draft-07 target: it emits a numeric `exclusiveMinimum`, which is what
    // OpenAPI 3.1 (JSON Schema 2020-12) requires. The 2019-09 target still
    // emits the draft-4 boolean form and fails validation.
    componentSchemas[name] = zodToJsonSchema(schema, {
      target: "jsonSchema7",
      $refStrategy: "none",
    });
  }

  const paths = buildPaths();
  addOperationIds(paths as Record<string, Record<string, unknown>>);

  return {
    openapi: "3.1.0",
    info: {
      title: "Food Planner API",
      version: "1.0.0",
      description:
        "Weekly meal planning, recipes and shopping lists. All endpoints are " +
        "scoped to the caller's household. Successful responses are wrapped " +
        "in `{ data }`; failures in `{ error }`.",
      license: { name: "Unlicensed — private, self-hosted" },
    },
    servers: [{ url: "/api/v1" }],
    security: [{ bearerAuth: [] }, { sessionCookie: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description:
            "Token from POST /auth/verify. Intended for native clients.",
        },
        sessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "fp_session",
          description: "Set by the magic-link callback for browsers.",
        },
      },
      schemas: componentSchemas,
    },
    paths,
  };
}

function buildPaths() {
  return {
      "/auth/request": {
        post: {
          summary: "Email a magic sign-in link",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { email: { type: "string", format: "email" } },
                  required: ["email"],
                },
              },
            },
          },
          responses: {
            200: okResponse("Link sent (or logged in dev)", ref("AuthRequestResult")),
            429: errorResponse("Too many requests"),
          },
        },
      },
      "/auth/verify": {
        post: {
          summary: "Exchange a magic-link token for a bearer token",
          description: "The non-browser counterpart to the callback redirect.",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { token: { type: "string" } },
                  required: ["token"],
                },
              },
            },
          },
          responses: {
            200: okResponse("Session created", ref("AuthVerifyResult")),
            400: errorResponse("Invalid or expired token"),
          },
        },
      },
      "/auth/callback": {
        get: {
          summary: "Magic-link landing point for browsers",
          description: "Sets the session cookie and redirects into the app.",
          security: [],
          parameters: [
            { name: "token", in: "query", required: true, schema: { type: "string" } },
          ],
          responses: { 307: { description: "Redirect to /app or /login" } },
        },
      },
      "/auth/me": {
        get: {
          summary: "Current user, household and members",
          responses: {
            200: okResponse(
              "Context, or null when not signed in",
              { oneOf: [ref("CurrentContext"), { type: "null" }] },
            ),
          },
        },
        patch: {
          summary: "Update your name and/or rename the household",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: ["string", "null"] },
                    householdName: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: okResponse("Updated context", ref("CurrentContext")), ...common },
        },
      },
      "/auth/logout": {
        post: {
          summary: "Revoke the current session",
          responses: { 200: okResponse("Signed out", ref("OkResult")) },
        },
      },
      "/households/invites": {
        post: {
          summary: "Create an invite link for a partner",
          responses: { 200: okResponse("Invite created", ref("InviteCreated")), ...common },
        },
      },
      "/households/invites/{code}": {
        get: {
          summary: "Preview an invite before accepting",
          security: [],
          parameters: [idParam("code")],
          responses: { 200: okResponse("Invite", ref("InvitePreview")), 404: common[404] },
        },
      },
      "/households/invites/{code}/accept": {
        post: {
          summary: "Join the inviting household",
          parameters: [idParam("code")],
          responses: {
            200: okResponse("Joined", ref("CurrentContext")),
            ...common,
            409: errorResponse("Invite already used or household full"),
          },
        },
      },
      "/recipes": {
        get: {
          summary: "List household recipes",
          parameters: [
            { name: "q", in: "query", schema: { type: "string" } },
            {
              name: "sort",
              in: "query",
              schema: { type: "string", enum: ["title", "least-recent"] },
            },
          ],
          responses: { 200: okResponse("Recipes", arrayOf("RecipeListItem")), ...common },
        },
        post: {
          summary: "Create a recipe",
          requestBody: jsonBody("RecipeInput"),
          responses: {
            201: okResponse("Created", { type: "object", properties: { id: { type: "string" } }, required: ["id"] }),
            ...common,
            409: errorResponse("Circular sub-recipe reference"),
          },
        },
      },
      "/recipes/{id}": {
        get: {
          summary: "Full recipe, sub-recipes expanded one level",
          parameters: [idParam("id")],
          responses: { 200: okResponse("Recipe", ref("RecipeDetail")), ...common },
        },
        put: {
          summary: "Replace a recipe",
          parameters: [idParam("id")],
          requestBody: jsonBody("RecipeInput"),
          responses: {
            200: okResponse("Updated", ref("RecipeDetail")),
            ...common,
            409: errorResponse("Circular sub-recipe reference"),
          },
        },
        delete: {
          summary: "Delete a recipe",
          parameters: [idParam("id")],
          responses: { 200: okResponse("Deleted", ref("OkResult")), ...common },
        },
      },
      "/recipes/search": {
        get: {
          summary: "Typeahead search, for picking sub-recipes",
          parameters: [{ name: "q", in: "query", schema: { type: "string" } }],
          responses: { 200: okResponse("Matches", arrayOf("RecipeSearchHit")), ...common },
        },
      },
      "/recipes/surprise": {
        get: {
          summary: "Weighted-random pick, favouring not-recently-cooked",
          parameters: [
            { name: "mealType", in: "query", schema: { type: "string", enum: ["BREAKFAST", "LUNCH", "DINNER"] } },
            { name: "exclude", in: "query", schema: { type: "string" }, description: "Previous pick, for re-rolling." },
          ],
          responses: { 200: okResponse("A recipe", ref("SurpriseResult")), ...common },
        },
      },
      "/recipes/import": {
        post: {
          summary: "Parse a recipe from a URL (does not save)",
          description:
            "Reads schema.org/Recipe JSON-LD with HTML fallbacks. Returns a " +
            "preview for the user to correct, then POST /recipes to save.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { url: { type: "string", format: "uri" } },
                  required: ["url"],
                },
              },
            },
          },
          responses: {
            200: okResponse("Parsed preview", ref("RecipeImportPreview")),
            400: errorResponse("Unfetchable, unparseable, or a private host"),
            429: errorResponse("Too many imports"),
          },
        },
      },
      "/meal-plans": {
        get: {
          summary: "Weeks that have entries",
          responses: { 200: okResponse("Weeks", arrayOf("WeekSummary")), ...common },
        },
      },
      "/meal-plans/{weekStart}": {
        get: {
          summary: "A week's plan (empty structure if none exists)",
          parameters: [weekStartParam],
          responses: { 200: okResponse("The week", ref("WeekPlan")), ...common },
        },
      },
      "/meal-plans/{weekStart}/entries": {
        post: {
          summary: "Add an entry to a slot",
          description: "Slots hold multiple entries; each may be assigned to a member.",
          parameters: [weekStartParam],
          requestBody: jsonBody("AddEntryInput"),
          responses: { 201: okResponse("Created", ref("WeekEntry")), ...common },
        },
      },
      "/meal-plans/entries/{entryId}": {
        patch: {
          summary: "Update an entry",
          parameters: [idParam("entryId")],
          requestBody: jsonBody("UpdateEntryInput"),
          responses: { 200: okResponse("Updated", ref("WeekEntry")), ...common },
        },
        delete: {
          summary: "Remove an entry",
          parameters: [idParam("entryId")],
          responses: { 200: okResponse("Deleted", ref("OkResult")), ...common },
        },
      },
      "/meal-plans/{weekStart}/copy": {
        post: {
          summary: "Copy another week's entries into this one",
          parameters: [weekStartParam],
          requestBody: jsonBody("CopyWeekInput"),
          responses: { 200: okResponse("Copied", ref("CopyWeekResult")), ...common },
        },
      },
      "/meal-plans/{weekStart}/suggestions": {
        get: {
          summary: "Recipes reusing ingredients this week already needs",
          description:
            "Shared-ingredient week shaping — 'this uses the rest of the " +
            "coriander'. Weighted towards perishables; staples are ignored. " +
            "Empty when nothing is planned yet.",
          parameters: [
            weekStartParam,
            { name: "mealType", in: "query", schema: { type: "string", enum: ["BREAKFAST", "LUNCH", "DINNER"] } },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 20, default: 6 } },
            { name: "exclude", in: "query", schema: { type: "string" } },
          ],
          responses: { 200: okResponse("Suggestions", arrayOf("OverlapSuggestion")), ...common },
        },
      },
      "/meal-plans/{weekStart}/shopping-list": {
        get: {
          summary: "The week's shopping list, if generated",
          parameters: [weekStartParam],
          responses: { 200: okResponse("The list", ref("ShoppingList")), ...common },
        },
      },
      "/meal-plans/{weekStart}/shopping-list/generate": {
        post: {
          summary: "Generate (or regenerate) the week's list",
          description:
            "Expands sub-recipes recursively, aggregates ingredients, skips " +
            "eating-out and free-text entries. Regenerating preserves " +
            "check-offs and manual items.",
          parameters: [weekStartParam],
          responses: { 200: okResponse("The list", ref("ShoppingList")), ...common },
        },
      },
      "/shopping-lists/{listId}/items": {
        post: {
          summary: "Add a manual item",
          parameters: [idParam("listId")],
          requestBody: jsonBody("ManualItemInput"),
          responses: { 201: okResponse("Created", ref("ShoppingItem")), ...common },
        },
      },
      "/shopping-list-items/{itemId}": {
        patch: {
          summary: "Check off or edit an item",
          parameters: [idParam("itemId")],
          requestBody: jsonBody("UpdateItemInput"),
          responses: { 200: okResponse("Updated", ref("ShoppingItem")), ...common },
        },
        delete: {
          summary: "Remove an item",
          parameters: [idParam("itemId")],
          responses: { 200: okResponse("Deleted", ref("OkResult")), ...common },
        },
      },
      "/uploads": {
        post: {
          summary: "Upload a recipe image",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: { file: { type: "string", format: "binary" } },
                  required: ["file"],
                },
              },
            },
          },
          responses: { 200: okResponse("Stored", ref("UploadResult")), ...common },
        },
      },
      "/uploads/{name}": {
        get: {
          summary: "Fetch an uploaded image",
          parameters: [idParam("name")],
          responses: {
            200: { description: "The image", content: { "image/*": {} } },
            404: common[404],
          },
        },
      },
  };
}
