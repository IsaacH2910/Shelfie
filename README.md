# 📚 Shelfie

A clean, cross‑device app to catalog the books you own — add them at home on your
Mac, then check your shelf from your phone at the bookshop so you never buy a
duplicate again.

- **Scan to add** — scan the ISBN barcode for instant title/author/cover, or snap
  a photo of the cover and let OCR fill in the details.
- **Shelf locations** — record where each book lives (e.g. _Living room · Shelf A3_).
- **Multilingual** — every book has a language, and different‑language editions of
  the same title are welcomed (and grouped), not blocked.
- **Duplicate aware** — a gentle warning if you already own a copy, but you can
  always add it anyway.
- **Private + shared** — keep a private library and share a household collection
  with family.
- **Works offline** — your catalog is cached, so it loads even with weak signal.
- **Installable PWA** — add it to your home screen on iOS, Android, or desktop.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS · Radix UI · TanStack Query ·
Supabase (Postgres + Auth + Storage) · ZXing (barcode) · Tesseract.js (OCR) ·
vite-plugin-pwa.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the local database

The database, auth, and storage run locally in Docker via the Supabase CLI — no
cloud account required, and everything lives in this repo. Make sure **Docker
Desktop is running**, then:

```bash
npm run db:start
```

The first run downloads the Supabase images (a few minutes). It applies
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
automatically and starts:

- API — <http://localhost:54321>
- Studio (browse your data) — <http://localhost:54323>
- Email inbox (magic-link testing) — <http://localhost:54324>

A ready‑to‑use `.env.local` pointing at this local stack is already in place, so
there's nothing else to configure. Stop the stack any time with `npm run db:stop`.

### 3. Run the app

```bash
npm run dev
```

Open <http://localhost:5173> and **sign up with email + password** (local email
confirmation is off, so you're in immediately). Magic-link and Google/Apple sign‑in
require real email/credentials, so they're for the deployed version.

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start the dev server (also on LAN)   |
| `npm run build`    | Type‑check and build for production   |
| `npm run preview`  | Preview the production build locally |
| `npm run lint`     | Lint with oxlint                     |
| `npm run db:start` | Start local Supabase (Docker)        |
| `npm run db:stop`  | Stop local Supabase                  |
| `npm run db:reset` | Recreate the DB and re‑apply migrations |
| `npm run db:studio`| Open Supabase Studio                 |

## Open it on your phone

### On the same Wi‑Fi (quick)

With the database and `npm run dev` running, open the **Network URL** that Vite
prints (e.g. `http://192.168.128.66:5173`) on your phone.

> The LAN address is baked into `.env.local` and the redirect URLs in
> [`supabase/config.toml`](supabase/config.toml). If your Mac's IP changes, update
> both and restart with `npm run db:stop && npm run db:start`.

Over a plain `http://` LAN address you can browse, search and add books manually,
but **barcode/camera scanning, install‑to‑home‑screen and offline mode need HTTPS**
(a secure context). For those, use the deployed version below.

### Anywhere, including the bookshop (deploy)

To use Shelfie on your phone away from home — with barcode scanning and install —
host it with a cloud database and an HTTPS URL:

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste and run
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. In **Authentication → Providers**, enable Email, Google and/or Apple; under
   **URL Configuration** add your site and redirect URLs.
4. Import the repo into [Vercel](https://vercel.com) and set `VITE_SUPABASE_URL`
   and `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.
5. Deploy. [`vercel.json`](vercel.json) handles SPA routing; add the Vercel URL to
   Supabase's redirect list.

Now the same URL works on every device over HTTPS, with the camera and PWA install
enabled.

**Detailed walkthrough:** see [`docs/DEPLOY.md`](docs/DEPLOY.md) for step-by-step
instructions (Supabase Cloud + Vercel, **self-hosted database on your own VPS**, custom
domains, backups, and troubleshooting).

## How it works

- Each book row is **private** when `household_id` is null, or **shared** when it
  points at a household you belong to. RLS ensures you only ever see your own books
  plus those of households you're a member of.
- ISBN lookups hit **Google Books** first and fall back to **Open Library**; both
  are free and support many languages.
- Cover art uses the lookup thumbnail when available; photos you take are uploaded
  to Supabase Storage.
- The catalog is cached for **offline browsing at the bookshop** (when your phone
  has no signal). Stopping the database with `npm run db:stop` does **not** delete
  your books — they stay in the Docker volume and come back when you run
  `npm run db:start`. While the database is stopped and your browser is online,
  the app shows **“Can't reach your library”** instead of stale cached records.
  To permanently wipe local dev data, run `npm run db:reset`.

## Project structure

```
src/
  components/       UI primitives (ui/) and feature components
  context/          Auth provider
  hooks/            Data hooks (books, households, profile)
  lib/              Supabase client, book lookup, duplicates, languages
  pages/            Auth, Library, AddBook, BookDetail, Household, Settings, Join
supabase/
  migrations/       Database schema + RLS
```
