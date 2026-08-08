# Food Planner — working notes for Claude

## Finishing work

**Commit and push to `main` when a piece of work is done — don't wait to be asked.**
This repo deploys from `main` via Coolify, so pushing is how a change actually
ships. Before pushing:

1. `npm run typecheck` and `npm run lint` must both pass.
2. If the change touches the Dockerfile, entrypoint, or anything in the deploy
   path, build the image and boot it against a database first — the production
   build catches things `next dev` never will.

Say plainly what was pushed and what remains unverified. If a change is risky,
ambiguous in scope, or destructive, still ask first — this standing permission
covers ordinary finished work, not judgement calls.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build (prisma generate + next build) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config, `eslint.config.mjs`) |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run seed` | Demo household, recipes and a starter week |
| `npm run api:spec` | Regenerate `openapi.json` from the Zod schemas |

## Things that bite

- **The service worker only exists in production builds.** `next dev` disables
  Serwist, so offline behaviour and PWA install can only be tested against
  `docker build` + run, not the dev server.
- **Session cookies are `Secure` in production.** The app won't hold a session
  over plain HTTP — fine behind Coolify's TLS, confusing when testing a
  container directly on localhost.
- **Magic links go to the server console when no email provider is set.** With
  no `RESEND_API_KEY` / `SMTP_HOST`, sign-in links are only in the logs.
- **Sign-in is rate limited** to 5 links per email per window. Scripted testing
  trips this quickly and then silently reuses a stale token.
- **Prisma's CLI is installed in its own Docker stage.** `node_modules/.bin/prisma`
  is a symlink that `COPY` flattens, which breaks its sibling `.wasm` lookups;
  cherry-picking `node_modules` subtrees also drops transitive deps like
  `effect`. Don't "simplify" that stage back into a subtree copy.
- **The build host is memory-constrained.** Keep the Docker build's peak memory
  down; stages that could run concurrently with the Next build have tipped it
  into the OOM killer before.

## Layout

Mobile-first. `AppContainer` in `src/components/app-shell.tsx` widens only the
routes with a grid to fill (planner, recipes); everything else stays at a
readable measure. Route `loading.tsx` skeletons cover navigation, since every
`/app` page is `force-dynamic`.

## Standing constraints from the brief

These are the decisions from the original brief that aren't obvious from the
code, and that changes should not quietly break:

- **All business logic lives behind versioned `/api/v1/...` JSON routes.** The
  web UI consumes the same API a future native app would. Don't bury logic in
  server components where a non-browser client can't reach it.
- **Auth must keep working for non-browser clients.** The magic-link flow hands
  back a bearer token (`POST /api/v1/auth/verify`), not just a cookie.
- **Household owns everything**, never the individual user. A solo user is a
  household of one.
- **The normalized `Ingredient` table is what makes shared-ingredient
  suggestions possible.** Keep normalization intact — if the same onion stops
  resolving to one ingredient row, both shopping aggregation and week shaping
  degrade silently.
- **No third-party analytics or trackers.** Self-hosted and private.
- **Don't guess unit conversions** beyond simple metric ones (g/kg, ml/l).
  Incompatible units get listed separately rather than merged.
- **Sub-recipe cycles must stay blocked on save**, at any nesting depth.

Everything in the brief is now built, including the two items deferred from v1:
shared-ingredient week shaping and the typed API contract.

## The API contract

`/api/v1` has two descriptions of itself, and they are kept honest by
construction rather than by discipline:

- `src/lib/api-types.ts` — the TypeScript surface. A pure re-export barrel; a
  client imports this instead of reaching into internal query modules.
- `openapi.json` — OpenAPI 3.1, regenerate with `npm run api:spec`, also served
  live at `GET /api/v1/openapi.json`. Validates clean under
  `npx @redocly/cli lint`, and generates a working client via
  `npx openapi-typescript`.

**How they stay in step.** `src/lib/openapi.ts` mirrors each DTO as a Zod schema
and pins it to the TypeScript type with `Assert<Equal<...>>`. Change a DTO
without changing its schema and `npm run typecheck` fails, naming the schema.
Request bodies reuse the same Zod schemas the routes validate with, so those
can't drift at all. Add an endpoint → add it to `buildPaths()`; add a DTO → add
its schema and assertion.

**What that does *not* catch:** whether a route actually returns what its DTO
claims. Type assertions compare types to types. A handler that spreads a Prisma
row into a DTO-typed return will leak columns and still typecheck — that
happened, and only validating live responses against the spec found it. When
touching response shapes, validate real payloads against `openapi.json`
(ajv over the component schemas) rather than trusting the types alone.

## Original brief

The verbatim project brief this app was built from. Useful for intent behind
decisions the code alone doesn't explain.

---

### Project Overview

Build a self-hosted web app for weekly meal planning, recipe management, and automatic shopping list generation. It will be deployed on **Coolify** via **GitHub pushes** using a **Dockerfile**. It is used by a household of one or two people.

### Tech Stack (adjust if you have strong reasons, but explain trade-offs first)

- **Framework:** Next.js (App Router, TypeScript) — single container serving frontend + API routes
- **Database:** PostgreSQL (provisioned as a Coolify service) with Prisma ORM
- **Auth:** Magic link email login (passwordless) using signed, single-use tokens; send email via **Resend** (free tier, `RESEND_API_KEY` env var), with a generic SMTP fallback option in config
- **Styling:** Tailwind CSS, mobile-first (this will mostly be used on phones)
- **PWA:** Installable Progressive Web App — web manifest, full icon set (192/512 maskable icons, Apple touch icon, favicon), theme colour, standalone display mode, and a service worker (e.g. Serwist/next-pwa) that caches the app shell and keeps the **shopping list readable offline** (in-store with bad signal is the key scenario; check-offs made offline should sync when back online)
- **Deployment:** Multi-stage Dockerfile (build → slim runtime), listens on `PORT` env var, healthcheck endpoint at `/api/health`. All config via environment variables (`DATABASE_URL`, `SMTP_*`, `APP_URL`, `AUTH_SECRET`). Prisma migrations run on container start.

### Core Data Model

- **User** — email, name. Logs in via magic link.
- **Household** — the unit that owns all data (recipes, plans, lists). A household has 1+ members. A single person is just a household of one; a partner joins via an invite link/code sent by the first user. All recipes, meal plans, and shopping lists belong to the household, not the individual, so both partners see and edit the same data.
- **Recipe** — title, description, ingredients (structured: quantity, unit, ingredient name, optional note), steps, servings, prep/cook time, tags, source URL (if imported), image, `lastUsedAt` (updated when it appears in a completed/past week).
- **Sub-recipes (recipe components)** — a recipe's ingredient list can include *another recipe* as a line item (e.g. steak tacos → 1× chimichurri, ½× guacamole), via a `RecipeComponent` join (parent recipe → child recipe + quantity multiplier). Rules:
  - Any recipe can be used as a sub-recipe; sub-recipes are also normal standalone recipes that can be planned on their own.
  - Support nesting (a sub-recipe can itself contain sub-recipes) but **detect and block circular references** on save.
  - Shopping list generation recursively expands sub-recipes into their base ingredients, applying multipliers at each level, before aggregating.
  - Recipe view shows sub-recipes as linked line items ("Chimichurri →") with their ingredients/steps expandable inline so you can cook from one screen.
- **Ingredient** — normalized ingredient names so "onion" in two recipes is recognized as the same item (needed for shopping list aggregation and future shared-ingredient suggestions).
- **MealPlan / MealSlot** — a plan is a week (Mon–Sun). Each day has breakfast, lunch, and dinner slots. **Critically: each slot supports multiple entries** — e.g. two different lunches when partners eat separately, each entry optionally assigned to a specific household member or "everyone". A slot entry is one of:
  - a recipe (with a serving multiplier),
  - a custom free-text entry ("leftovers", "sandwiches"),
  - an **Eating Out** marker (excluded from the shopping list, shown distinctly in the UI, optional note like the restaurant name).
- **ShoppingList / ShoppingListItem** — generated from a week's plan; items are checkable, manually addable/removable/editable, and aggregated across recipes (e.g. 2 recipes each needing 1 onion → "2 onions"). Handle unit merging sensibly (same unit → sum; incompatible units → list both, don't guess conversions beyond simple metric ones like g/kg, ml/l).

### Features

#### 1. Recipe import from websites
- Paste a URL → server fetches the page → parse **schema.org/Recipe JSON-LD** (covers most recipe sites), falling back to microdata/common HTML patterns.
- Show a preview/edit screen before saving so the user can fix parsing mistakes.
- Parse ingredient strings into structured quantity/unit/name (use a parsing library or write a robust parser; keep the raw string as fallback).

#### 2. Custom recipes
- Full manual recipe editor for family recipes. Allow "loose" recipes with minimal detail (just a title and rough ingredient list) — not everything needs steps.
- In the ingredient editor, allow adding a **sub-recipe** as a line item: search existing recipes, pick one, set a multiplier. Offer "create new recipe" inline if the sub-recipe doesn't exist yet (e.g. adding guacamole mid-edit).

#### 3. Weekly planner
- Week view grid: days × (breakfast / lunch / dinner), works well on a phone (probably day-by-day cards on mobile, grid on desktop).
- Add multiple meals per slot (the double-lunch case), assign to a person or everyone.
- Mark any slot as Eating Out.
- Copy a previous week as a starting point.

#### 4. Suggestions & Surprise Me
- When picking a meal for a slot, show a "haven't had in a while" section sorted by `lastUsedAt` (oldest first), filterable by tag/meal type.
- **Surprise Me** button: picks a random recipe, weighted toward recipes not used recently and matching the slot's meal type if tagged. One-tap re-roll.

#### 5. Shopping list generation
- "Generate list" from the current week's plan: aggregates ingredients across all recipe slot entries (respecting serving multipliers), **recursively expanding sub-recipes** into base ingredients, and skips Eating Out and free-text entries.
- Group items by category (produce, dairy, meat, pantry, etc.) for easier shopping.
- Checkable items with state persisted (so it works as the in-store list). Manual items can be added.
- Regenerating after plan changes should preserve checked-off state and manual items where possible.

#### 6. Auth & accounts
- Magic link login only (no passwords). Email a signed single-use link, short expiry, sets a session cookie.
- First login creates a user + household. Settings page has "Invite partner" → generates an invite link; partner logs in via their own magic link and lands in the shared household.
- Works perfectly fine as a single-person household with no partner invited.

#### 7. Future feature — design the schema for it now, build later
- **Shared ingredients week-shaping:** when planning, suggest recipes that overlap ingredients with meals already chosen that week ("this uses the rest of the coriander"), to reduce waste and shopping volume. The normalized Ingredient table exists to enable this — just don't build the suggestion engine in v1.
- **Native mobile app readiness:** structure the backend so a future native/hybrid app (React Native/Expo or Capacitor wrapping the PWA) can reuse it without rework:
  - Put all business logic behind clean, versioned JSON API routes (`/api/v1/...`) — the web UI consumes the same API a future app would; no logic buried in server components that an app couldn't reach.
  - Auth must work for non-browser clients too: magic link flow that can hand back a bearer token, not only a browser cookie.
  - Keep responses well-typed (shared TypeScript types package or generated OpenAPI spec) so an app client can be generated later.
  - Don't build the app now — just don't paint the architecture into a corner.

### Non-functional requirements

- Mobile-first UI; the planner and shopping list must be genuinely pleasant on a phone.
- No third-party analytics or trackers; self-hosted and private.
- Seed script with a few demo recipes for development.
- Basic protection: all data scoped to household, magic link tokens single-use, rate-limit the login email endpoint.

### Build Order (work in phases, commit after each, keep the app deployable at every phase)

1. **Scaffold & deploy pipeline** — Next.js + Prisma + Postgres, Dockerfile, healthcheck, migrations on boot. Verify it builds and runs in Docker locally before anything else.
2. **Auth & households** — magic links, sessions, household creation, partner invites.
3. **Recipes** — custom recipe CRUD + structured ingredients, then URL import with preview/edit.
4. **Weekly planner** — week grid, multi-entry slots, person assignment, eating-out markers, copy-last-week.
5. **Shopping list** — generation, aggregation, categories, check-off, manual items.
6. **Suggestions** — lastUsedAt tracking, "haven't had in a while", Surprise Me.
7. **PWA** — manifest, icon set, service worker, offline shopping list, install prompt hint in the UI. Generate a simple clean app icon (e.g. a plate/fork mark on a solid colour) as SVG and export the required PNG sizes; I can replace it with a designed one later.
8. **Polish** — mobile UX pass, empty states, seed data, README with Coolify setup instructions (env vars, Postgres service, domain, GitHub webhook deploy).

Before writing code, confirm your understanding of the data model back to me — especially the multi-entry meal slots and household sharing — and flag any decisions you're unsure about.

### Coolify deployment notes

- Create a Postgres resource in Coolify, note the internal connection string.
- Create an Application resource from the GitHub repo, build pack = Dockerfile, auto-deploy on push.
- Set env vars: `DATABASE_URL`, `APP_URL`, `AUTH_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM` (must be a verified domain/sender in Resend).
- Attach a domain + HTTPS via Coolify.
