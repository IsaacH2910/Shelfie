# Deploying Shelfie

Make Shelfie available on any device over HTTPS — required for barcode scanning,
camera, PWA install, and offline use away from your home network.

## How the pieces fit together

| Part | Role | Where it runs |
|------|------|---------------|
| **Frontend** (React PWA) | UI, barcode, OCR, offline cache | Static hosting (Vercel, nginx, …) |
| **Book lookup API** | Worldwide ISBN metadata | Vercel serverless (`/api/book-lookup`) or Vite in local dev |
| **Backend** (Supabase) | Postgres, auth, storage | Supabase Cloud or self-hosted |

Every device opens the **same HTTPS site**, which talks to **one** Supabase project.
Same account → same books everywhere.

```
  Laptop ───┐
            ├──► https://your-app.example.com
  Phone ────┘              │
                           ├──► /api/book-lookup  (ISBN metadata)
                           └──► Supabase API      (your catalog)
```

Local Docker (`npm run db:start`) is for development on your LAN only. For use
anywhere, the backend must be on the public internet with HTTPS.

---

## Choose a setup

| Goal | Database | Frontend | Difficulty |
|------|----------|----------|------------|
| Fastest path | [Supabase Cloud](#path-a--supabase-cloud--vercel) | Vercel | Easy |
| You own the data | [Self-hosted Supabase](#path-b--self-hosted-database--vercel-frontend) | Vercel | Medium |
| Full control | Self-hosted Supabase | nginx / Caddy | Harder |

---

## Path A — Supabase Cloud + Vercel

### A1 — Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a project.
2. Save the database password and pick a region close to you.
3. Wait for provisioning to finish (~2 minutes).

### A2 — Apply the schema

In the Supabase dashboard → **SQL Editor**, run each file in
[`supabase/migrations/`](../supabase/migrations/) **in order** (full contents of each file).

You should see success for tables, RLS policies, and storage.

### A3 — Copy API keys

**Project Settings → API**:

| Dashboard label | Environment variable |
|-----------------|----------------------|
| Project URL | `VITE_SUPABASE_URL` |
| anon public key | `VITE_SUPABASE_ANON_KEY` |

The anon key is safe in the frontend; Row Level Security keeps users’ books private.

### A4 — Configure authentication

1. **Authentication → Providers → Email** — enable Email. For personal use you can
   disable “Confirm email” so sign-up is instant.
2. **Authentication → URL Configuration** (after you have the Vercel URL from A7):
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**:
     ```
     https://your-app.vercel.app
     https://your-app.vercel.app/**
     http://localhost:5173
     ```
3. Optionally enable Google / Apple OAuth and add the same redirect URLs there.
4. To let users link Gmail to an email/password account: **Authentication →
   Providers → Email** (or Auth settings) → enable **Manual linking**.

### A5 — Import the repo into Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New… → Project** and import this repository.
3. Keep the Vite defaults: build `npm run build`, output `dist`.

### A6 — Environment variables on Vercel

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Project URL from A3 |
| `VITE_SUPABASE_ANON_KEY` | anon key from A3 |
| `VITE_GOOGLE_BOOKS_API_KEY` | Optional — higher Google Books quota |
| `ADMIN_PASSWORD` | Password for the hidden `/admin` panel (account name is always `admin`). Set for **Production** and **Preview**. |
| `ADMIN_SESSION_SECRET` | Optional long random string for signing admin session tokens |

Apply to **Production** and **Preview**. Vite bakes `VITE_*` in at build
time — **redeploy** after changing them.

[`vercel.json`](../vercel.json) serves the SPA while leaving `/api/*` for the
book-lookup function. No extra Vercel config is required for that route.

### A7 — Deploy and finish auth URLs

1. Click **Deploy** and note the URL (`https://….vercel.app`).
2. Set Supabase **Site URL** and **Redirect URLs** to that URL (A4).
3. Open the site on your phone, create an account, and confirm books sync with your laptop.

### A8 — Install as a PWA

- **iPhone (Safari)**: Share → **Add to Home Screen**
- **Android (Chrome)**: Menu → **Install app** / **Add to Home Screen**

### A9 — Custom domain (optional)

1. Vercel → **Settings → Domains** → add your domain and follow DNS instructions.
2. Update Supabase Site URL and Redirect URLs to the custom domain.

---

## Path B — Self-hosted database + Vercel frontend

Run **Supabase** on a VPS; keep the website on Vercel for free HTTPS and CDN.

### What you need

- A VPS (~2 GB RAM minimum for Supabase)
- A domain (e.g. `api.example.com` for Supabase, `app.example.com` for the frontend)
- SSH access

### B1 — Server prep

Install Docker, then open only `80`/`443` publicly. Do **not** expose Postgres `5432`.

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in
```

### B2 — Self-hosted Supabase

Follow [Supabase self-hosting with Docker](https://supabase.com/docs/guides/self-hosting/docker).

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
# Set strong POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY, …
docker compose up -d
```

Never commit the self-hosted `.env`.

### B3 — Apply Shelfie migrations

Run each file in [`supabase/migrations/`](../supabase/migrations/) via Studio (SSH
tunnel to Studio) or `psql` over a tunnel — not over the public internet.

### B4 — HTTPS in front of the API

Example Caddyfile:

```
api.example.com {
    reverse_proxy localhost:8000
}
```

Then:

```env
VITE_SUPABASE_URL=https://api.example.com
VITE_SUPABASE_ANON_KEY=<ANON_KEY from self-hosted .env>
```

### B5 — Auth redirect URLs

Set on the self-hosted Auth config:

- `SITE_URL` = your frontend HTTPS URL
- Additional redirects for that URL and `http://localhost:5173`

Restart Auth after changes.

### B6 — Deploy the frontend

Same as Path A steps A5–A8, using the self-hosted URL and anon key.

### B7 — Backups

You own backups on self-hosted:

```bash
docker exec supabase-db pg_dump -U postgres postgres | gzip > /backups/shelfie-$(date +%F).sql.gz
```

Store copies off-server.

---

## Path C — Fully self-hosted

Serve the built app from the same VPS:

```bash
VITE_SUPABASE_URL=https://api.example.com \
VITE_SUPABASE_ANON_KEY=your-anon-key \
npm run build
# Copy dist/ to your web root
```

Point the app hostname at static files and the API hostname at Supabase. Rebuild
whenever env or code changes.

---

## Local vs production

| | Local | Production |
|---|--------|------------|
| Database | `npm run db:start` | Cloud or VPS Supabase |
| Frontend | `npm run dev` | Vercel or your server |
| Env | `.env.local` (from `.env.example`) | Hosting dashboard / build-time |
| Book lookup | Vite middleware → `api/book-lookup.mjs` | Vercel `/api/book-lookup` |
| Away from home Wi‑Fi | ❌ | ✅ Path A or B |

Use local Supabase for development; production URLs only in production builds.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Can't reach your library” | DB down or wrong `VITE_SUPABASE_URL` — check dashboard/VPS and redeploy if env changed |
| Login redirect loop | Add the exact frontend URL to Supabase **Redirect URLs** |
| Camera / barcode fails | Must use an **HTTPS** URL, not `http://192.168.x.x` |
| Empty library on one device | Different accounts, or that device is still on old/local env |
| CORS / missing ISBN metadata | Confirm `/api/book-lookup` is reachable on the deployed host; redeploy after env changes |

---

## Checklist

- [ ] Database running (Cloud or self-hosted) with HTTPS
- [ ] All files in `supabase/migrations/` applied in order
- [ ] Frontend deployed with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- [ ] Auth Site URL and Redirect URLs match the frontend
- [ ] Same account on every device
- [ ] HTTPS URL on phone: add book → appears on laptop after refresh
