# Shelfie

Catalog the books you own — add them at home, then check your shelf from your
phone at the bookshop so you never buy a duplicate.

- **Scan to add** — ISBN barcode for instant title/author/cover, or snap the cover
  and let OCR fill in the details (Latin, Chinese, Japanese, and more).
- **Worldwide ISBN lookup** — several free metadata sources in parallel, including
  editions Google Books often misses.
- **Shelf locations** — record where each book lives (e.g. _Living room · Shelf A3_).
- **Multilingual** — every book has a language; different‑language editions of the
  same title are welcomed and grouped, not blocked.
- **Duplicate aware** — a warning if you already own a copy; you can still add it.
- **Smart collections** — rule-based groups (e.g. “Read this year”, “500+ pages”).
- **Library insights** — heuristic next-reads and per-book context from your shelves.
- **Private + shared** — a private library and optional household collections.
- **Works offline** — the catalog is cached for weak or no signal.
- **Installable PWA** — add to home screen on iOS, Android, or desktop.
- **Desktop shell (beta)** — optional Tauri 2 wrapper for a native macOS window.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS · Radix UI · TanStack Query ·
Supabase (Postgres + Auth + Storage) · ZXing · Tesseract.js ·
Vercel serverless (`/api/book-lookup`) · vite-plugin-pwa.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the local database

Requires **Docker Desktop** running:

```bash
npm run db:start
```

This applies [`supabase/migrations/`](supabase/migrations/) and starts:

- API — <http://localhost:54321>
- Studio — <http://localhost:54323>
- Email inbox (magic-link testing) — <http://localhost:54324>

Stop anytime with `npm run db:stop`.

### 3. Configure env

```bash
cp .env.example .env.local
```

For local Supabase, fill in the URL and anon key printed by `npm run db:start`
(also shown in `supabase status`).

### 4. Run the app

```bash
npm run dev
```

Open <http://localhost:5173> and sign up with email + password (local email
confirmation is off). Vite serves [`api/book-lookup.mjs`](api/book-lookup.mjs) at
`/api/book-lookup` so ISBN lookup matches production.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server (LAN too) |
| `npm run build` | Type-check and production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint with oxlint |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run db:start` | Start local Supabase |
| `npm run db:stop` | Stop local Supabase |
| `npm run db:reset` | Recreate DB and re-apply migrations |
| `npm run db:studio` | Open Supabase Studio |
| `npm run desktop:dev` | Tauri desktop shell + Vite (needs Rust) |
| `npm run desktop:build` | Bundle a native desktop app |
| `npm run desktop:build:signed` | Mac build with updater signature (needs `src-tauri/keys/shelfie.key`) |

## Desktop shell (Tauri)

Requires [Rust](https://www.rust-lang.org/tools/install) and Xcode CLT on macOS.
Full build, unsigned install, and update instructions: **[`docs/DESKTOP.md`](docs/DESKTOP.md)**.

```bash
npm install
npm run desktop:dev
```

Cross-device sync still uses Supabase (not iCloud). Native Spotlight indexing,
Quick Look previews, and home-screen widgets are **future** Tauri plugins —
stubs and notes live in [`src-tauri/src/lib.rs`](src-tauri/src/lib.rs).

## Deploy

For barcode scanning, PWA install, and use away from home Wi‑Fi you need **HTTPS**
and a cloud (or self-hosted) database.

See **[`docs/DEPLOY.md`](docs/DEPLOY.md)** for Supabase Cloud + Vercel, self-hosted
database on a VPS, custom domains, backups, and troubleshooting.

Quick version:

1. Create a [Supabase](https://supabase.com) project and run every file in
   `supabase/migrations/` in order.
2. Deploy this repo to [Vercel](https://vercel.com) with `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` (optional: `VITE_GOOGLE_BOOKS_API_KEY`).
3. Add the Vercel URL to Supabase Auth redirect URLs.

## How it works

- Books are **private** when `household_id` is null, or **shared** with a household
  you belong to. RLS limits what each user can see.
- ISBN lookups use **`/api/book-lookup`**, which queries Google Books, Open Library,
  openBD, isbn.tw, isbnsearch.org, and Internet Archive in parallel. If the API is
  unreachable, the browser falls back to Open Library and Google Books. Missing
  covers fall back to Open Library’s ISBN cover endpoint.
- Cover photos upload to Supabase Storage; OCR uses Tesseract language packs for
  every language in the app.
- The catalog is cached for offline browsing. `npm run db:stop` does **not** delete
  local data (Docker volume). While the DB is down and the browser is online, the
  app shows “Can't reach your library” instead of stale cache. Wipe local data with
  `npm run db:reset`.

## Project structure

```
api/                Worldwide ISBN lookup (Vercel + Vite dev)
docs/               Deploy guide
src/
  components/       UI and feature components
  context/          Auth provider
  hooks/            Books, households, profile
  lib/              Supabase, lookup, camera, OCR, smart collections
  pages/            App screens
src-tauri/          Optional Tauri 2 desktop shell
supabase/           Migrations + local config
e2e/                Playwright tests + manual checklist
```
