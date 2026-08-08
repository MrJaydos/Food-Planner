/**
 * The public type surface of the `/api/v1` API.
 *
 * This is the module a future native client (or any other consumer) imports:
 * every request and response shape the API speaks, in one place, so nobody has
 * to reach into internal query modules to find out what an endpoint returns.
 *
 * Keep this a pure re-export barrel — no runtime code, no server imports — so
 * it stays safe to pull into a client bundle or copy into another project.
 *
 * The machine-readable equivalent is `openapi.json` (`npm run api:spec`, also
 * served at GET /api/v1/openapi.json). Both are checked against each other at
 * compile time in `openapi.ts`, so they cannot drift apart silently.
 */

import type { MealType, SlotEntryKind, IngredientCategory } from "@prisma/client";

// Prisma enums, re-exported so consumers don't need the Prisma client.
export type { MealType, SlotEntryKind, IngredientCategory };

export type HouseholdRole = "OWNER" | "MEMBER";

// --- Envelopes ------------------------------------------------------------

/** Every successful response is wrapped in `{ data }`. */
export interface ApiSuccess<T> {
  data: T;
}

/** Every failure is wrapped in `{ error }`. */
export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "bad_request"
  | "conflict"
  | "rate_limited"
  | "server_error";

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// --- Auth & household -----------------------------------------------------

export type { Member, CurrentContext } from "./context";
export type { InvitePreview } from "./accounts";

export interface AuthRequestResult {
  emailSent: boolean;
  message: string;
  /** Dev only — the magic link, when no email provider is configured. */
  devLink?: string;
}

export interface AuthVerifyResult {
  /** Bearer token for non-browser clients. */
  token: string;
  user: { id: string; email: string; name: string | null };
  householdId: string;
}

export interface InviteCreated {
  code: string;
  url: string;
  expiresAt: string;
}

// --- Recipes --------------------------------------------------------------

export type {
  RecipeListItem,
  RecipeIngredientDTO,
  RecipeComponentChildDTO,
  RecipeComponentDTO,
  RecipeDetail,
} from "./recipe-queries";

export type {
  RecipeInput,
  RecipeIngredientInput,
  RecipeComponentInput,
} from "./recipes";

export type { RecipeImportPreview } from "./recipe-import";
export type { ParsedIngredient } from "./ingredient-parse";

export interface RecipeSearchHit {
  id: string;
  title: string;
}

export interface RecipeCreated {
  id: string;
}

// --- Meal plans -----------------------------------------------------------

export type {
  WeekEntryDTO,
  WeekDayDTO,
  WeekPlanDTO,
  AddEntryInput,
  UpdateEntryInput,
} from "./meal-plans";

export interface WeekSummary {
  weekStart: string;
  entryCount: number;
}

export interface CopyWeekResult {
  copied: number;
}

// --- Shopping list --------------------------------------------------------

export type {
  ShoppingItemDTO,
  ShoppingListDTO,
  ManualItemInput,
  UpdateItemInput,
} from "./shopping-queries";

// --- Ideas & quick notes --------------------------------------------------

export type { IdeaDTO, IdeaInput, UpdateIdeaInput } from "./ideas";

// --- Suggestions ----------------------------------------------------------

export type { SurpriseResult } from "./suggestions";
export type { OverlapSuggestion } from "./ingredient-overlap";

// --- Misc -----------------------------------------------------------------

export interface HealthStatus {
  status: "ok" | "degraded";
  database: boolean;
  uptime: number;
  latencyMs: number;
  timestamp: string;
}

export interface UploadResult {
  url: string;
}

export interface OkResult {
  ok: true;
}
