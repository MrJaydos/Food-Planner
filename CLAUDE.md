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
