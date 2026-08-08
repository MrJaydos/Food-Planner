# Food Planner

A self-hosted web app for weekly meal planning, recipe management, and automatic
shopping-list generation. Built for a household of one or two people, mobile-first,
installable as a PWA, and deployed on [Coolify](https://coolify.io) via a Dockerfile.

- **Framework:** Next.js (App Router, TypeScript) — one container serving the UI + API
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** Passwordless magic-link login (cookie sessions + bearer tokens for future native clients)
- **Styling:** Tailwind CSS, mobile-first
- **PWA:** Installable, offline-readable shopping list (Serwist service worker)
- **Deploy:** Multi-stage Dockerfile, healthcheck at `/api/health`, Prisma migrations on boot

> **Status:** built in phases. Phase 1 (scaffold + deploy pipeline) is complete;
> later phases add auth, recipes, the planner, the shopping list, suggestions, and PWA polish.

## Data model at a glance

- **Household** owns everything (recipes, plans, lists, ingredients). One or two
  **Users** join a household via **Membership**. A solo user is a household of one.
- **Recipe** has structured ingredients, steps, tags, and can include other recipes
  as **sub-recipes** (`RecipeComponent`, with cycle detection).
- **Ingredient** is normalized per household so the same item aggregates across recipes.
- **MealPlan** is a week; each day has breakfast/lunch/dinner **MealSlot**s; each slot
  holds **multiple entries** (recipe / custom text / eating-out), each optionally
  assigned to a member or "everyone".
- **ShoppingList** is generated from a week, expanding sub-recipes recursively and
  aggregating ingredients; items are checkable and manually editable.

## Local development

Requires Node 22+ and a PostgreSQL 16 database.

```bash
cp .env.example .env          # then edit DATABASE_URL, AUTH_SECRET, etc.
npm install
npm run prisma:migrate        # apply migrations to your dev DB
npm run seed                  # optional: demo recipes (added in a later phase)
npm run dev                   # http://localhost:3000
```

If no email provider is configured (`RESEND_API_KEY` / `SMTP_*`), magic-link URLs
are printed to the server console so you can log in locally without sending email.

### Useful scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (generates Prisma client + Next build) |
| `npm start` | Run the production server |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:deploy` | Apply migrations (used on container boot) |
| `npm run typecheck` | TypeScript check |
| `npm run seed` | Seed demo data |

## Environment variables

See [`.env.example`](./.env.example) for the full annotated list. The essentials:

| Var | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Postgres connection string |
| `APP_URL` | ✅ | Public base URL (used to build magic links), no trailing slash |
| `AUTH_SECRET` | ✅ | Long random string for signing tokens (`openssl rand -base64 48`) |
| `PORT` | | Port to listen on (default 3000; set by Coolify/Docker) |
| `EMAIL_FROM` | | Sender address; must be a verified sender/domain in Resend |
| `RESEND_API_KEY` | | Resend API key (preferred email provider) |
| `SMTP_HOST` etc. | | Generic SMTP fallback if not using Resend |
| `UPLOAD_DIR` | | Directory for recipe image uploads (mount a volume here) |

## Running with Docker locally

```bash
docker build -t food-planner .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/foodplanner" \
  -e APP_URL="http://localhost:3000" \
  -e AUTH_SECRET="$(openssl rand -base64 48)" \
  -v food_planner_uploads:/app/uploads \
  food-planner
```

The container runs `prisma migrate deploy` on start (with retries so it waits for
the database), then serves the app. Healthcheck: `GET /api/health`.

## Deploying on Coolify

1. **Postgres:** Create a *PostgreSQL* resource in Coolify. Note its **internal**
   connection string (host is the service name, reachable from the app container).
2. **Application:** Create an *Application* resource from this GitHub repo.
   - Build pack: **Dockerfile**
   - Enable **auto-deploy on push** (Coolify sets up the GitHub webhook for you).
3. **Environment variables** on the Application:
   - `DATABASE_URL` — the internal Postgres URL from step 1
   - `APP_URL` — your public domain, e.g. `https://food.example.com`
   - `AUTH_SECRET` — `openssl rand -base64 48`
   - `RESEND_API_KEY` — from [resend.com](https://resend.com) (free tier)
   - `EMAIL_FROM` — a **verified** sender/domain in Resend
   - (optional) `SMTP_*` instead of Resend
4. **Persistent storage:** Add a volume mounted at `/app/uploads` so recipe image
   uploads survive redeploys.
5. **Domain + HTTPS:** Attach your domain in Coolify and enable HTTPS (Let's Encrypt).
6. Push to the repo — Coolify builds the Dockerfile, runs migrations on boot, and
   deploys. Watch the healthcheck at `/api/health` go green.

## Privacy

No third-party analytics or trackers. All data is scoped to your household and stays
on your server.
