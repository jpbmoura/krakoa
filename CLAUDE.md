# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — start Next.js dev server
- `pnpm build` — production build
- `pnpm start` — serve the production build

No lint or test scripts are configured. Package manager is pnpm (a `pnpm-lock.yaml` is committed); npm works too.

## Environment

- `DATABASE_URL` — Postgres connection string (Railway injects this automatically when a Postgres service is linked). Required for `/api/progress`.

Covers come from the unauthenticated [Marvel Metadata API](https://marvel.emreparker.com) (`marvel.emreparker.com/v1`). Rate limit: 60 req/min, 30 burst — the three-layer cache below keeps us well under that.

### Node version pin

`.nvmrc` pins Node 22. Node 25 exposes a broken `globalThis.localStorage` stub that crashes Next's Fast Refresh — the `dev` script prepends `--no-experimental-webstorage` to work around that if you're stuck on 25 locally. `build` and `start` do not carry that flag (Node 22 doesn't accept it), so Railway (which respects `.nvmrc`) runs the plain Next binary.

## Architecture

Stack: Next.js 15 App Router, React 19, TypeScript strict, no CSS framework (styles live in `app/globals.css`). Path alias `@/*` maps to the repo root.

### Data model → UI pipeline

Guides are static TypeScript data, not a database. The type hierarchy is `Guide → Phase → Section → Issue` (see `lib/guides.ts`). Every `Issue` has a `tier` of `essential | recommended | completionist`, which drives the "Só a espinha / + Recomendados / Tudo" filter in `components/GuideView.tsx`. Progress bars recompute per active filter, so counts reflect only visible items.

### Adding a new guide

1. Create `data/<slug>.ts` exporting a `Guide` (mirror `data/krakoa.ts`).
2. Import and append to the `guides` array in `lib/guides.ts`.

That's it — the index page (`app/page.tsx`) and dynamic route (`app/guide/[slug]/page.tsx` with `generateStaticParams`) pick it up automatically.

Each `Issue.cover` is a query: `q` is a series title with year (e.g. `"X-Men (2019)"`), `issue` is the issue number. The route strips parens before searching (they 500 the upstream API); the year inside them becomes an extra token that helps disambiguate homonymous series. The upstream search is fuzzy full-text (e.g. `"House of X"` also matches "House of M"), so the route validates that every token of the query appears in the returned `seriesName` before accepting a match.

### Progress persistence

`lib/useProgress.ts` (client hook) reads/writes via `app/api/progress/route.ts`. Storage is Postgres — one row per read issue in table `progress(slug, issue_id, read_at)`, primary key `(slug, issue_id)`. **Absence of row = unread**, which mirrors the old localStorage model (deleted keys meant unread) and keeps the API map compact.

Intentional single-user model: no `user_id` column, no auth, no cookies. Anyone who reaches the URL shares one state. That's the design — see the README callout. If you ever add multi-tenancy, the schema needs a `user_id` column and a `PRIMARY KEY (user_id, slug, issue_id)`.

The hook updates the UI optimistically and only reverts on POST failure — the DB round-trip is invisible to the user during a checkbox click. The `loaded` boolean gates the header progress-count text (`GuideView.tsx` shows `…` until the initial GET resolves).

Schema is created lazily on first API call via `lib/db.ts` — a module-level promise runs `CREATE TABLE IF NOT EXISTS` once per process. No separate migration step, no ORM.

### Cover fetching (three-layer cache)

`components/CoverHover.tsx` requests `/api/cover?q=…&issue=…` on hover. Caches, in order:

1. In-memory `Map` in the component module (per browser tab).
2. `localStorage` under `cover:<q>#<issue>` (persists across tabs).
3. Server-side in-memory `Map` in `app/api/cover/route.ts` **plus** Next's `fetch({ next: { revalidate: 2592000 } })` (30 days) on both upstream calls.

The upstream flow is two calls: `/v1/search/issues?q=…` (search items don't carry the cover) → `/v1/issues/{id}` (has `cover.path`/`cover.extension`). The final URL is composed as `{path}/portrait_uncanny.{extension}` — the path is Marvel's own CDN (`i.annihil.us`), so Marvel's variant-size suffixes still work.

Net effect: each unique cover consumes at most two upstream calls, once. If you change the payload shape returned by `/api/cover`, invalidate both the client `memCache`/`localStorage` keys and the server `cache` map — old cached entries will otherwise deserialize with missing fields.

### Language

All user-facing copy is Portuguese (pt-BR). Match that when adding UI strings; keep code identifiers in English.
