# Deploying Shelfie — anywhere, any device

This guide explains how to make Shelfie work on your Mac, phone, and bookshop — even on
different Wi‑Fi networks — and how to **self‑host the database** on your own server.

## How the pieces fit together

Shelfie has two parts:

| Part | What it does | Where it runs |
|------|----------------|---------------|
| **Frontend** (React PWA) | UI, barcode scan, offline cache | Browser; static files on Vercel or your server |
| **Backend** (Supabase) | Postgres, login, book storage, cover photos | Cloud **or** your VPS |

Your phone and Mac both open the **same HTTPS website**. That site talks to **one database**.
Sign in with the same account → same books everywhere.

```
  Mac ──────┐
            ├──► https://shelfie.example.com (frontend)
  Phone ────┘              │
                           ▼
              https://api.example.com (Supabase — cloud or self-hosted)
                           │
                           ▼
                     PostgreSQL (your books)
```

**Local dev** (`npm run db:start` on your Mac) only works on your home network. For
**anywhere / anytime**, the backend must be reachable on the **public internet** with
**HTTPS**.

---

## Choose your setup

| Goal | Database | Frontend | Difficulty |
|------|----------|----------|------------|
| Quick start, free tier | [Supabase Cloud](#path-a-supabase-cloud--vercel) | Vercel | Easy |
| **You own the database** | [Self-hosted Supabase on VPS](#path-b-self-hosted-database--vercel-frontend) | Vercel | Medium |
| Everything on your hardware | Self-hosted Supabase | Self-hosted nginx | Harder |

Recommended for self-hosting: **Path B** — database on your VPS, frontend on Vercel (free HTTPS + CDN).

---

## Path A — Supabase Cloud + Vercel

Best if you want the fastest path to “works on my phone at the bookshop.” Supabase hosts
the database; you don’t manage servers.

### Step A1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up.
2. Click **New project**.
3. Pick an organization, name (e.g. `shelfie`), a **strong database password** (save it), and a region close to you.
4. Wait ~2 minutes for the project to provision.

### Step A2 — Run the database schema

1. In the Supabase dashboard, open **SQL Editor** (left sidebar).
2. Click **New query**.
3. On your Mac, open [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) in this repo.
4. Copy the **entire file** and paste it into the SQL Editor.
5. Click **Run**. You should see “Success” — this creates tables, security rules, and storage.

### Step A3 — Copy API keys

1. Go to **Project Settings** (gear icon) → **API**.
2. Copy these two values (you’ll need them twice — Vercel and locally):

   | Dashboard label | Environment variable |
   |-------------------|----------------------|
   | Project URL | `VITE_SUPABASE_URL` |
   | anon public key | `VITE_SUPABASE_ANON_KEY` |

The **anon** key is safe to embed in the frontend; Row Level Security in Postgres stops users from seeing each other’s books.

### Step A4 — Configure authentication

1. **Authentication** → **Providers** → **Email**  
   - Enable Email.  
   - For personal use, you can disable “Confirm email” so sign-up works instantly.

2. **Authentication** → **URL Configuration** (do this **after** Step B4 when you have your Vercel URL):
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs** — add each of these (one per line):
     ```
     https://your-app.vercel.app
     https://your-app.vercel.app/**
     http://localhost:5173
     ```

3. (Optional) Enable **Google** or **Apple** under Providers if you want OAuth. You’ll need developer credentials from Google/Apple and must add the same redirect URLs there.

### Step B1 — Push code to GitHub

If the repo isn’t on GitHub yet:

```bash
cd /path/to/Books
git init
git add .
git commit -m "Initial Shelfie app"
# Create an empty repo on github.com, then:
git remote add origin https://github.com/YOUR-USER/shelfie.git
git branch -M main
git push -u origin main
```

### Step B2 — Import into Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New…** → **Project**.
3. Import your `Books` / `shelfie` repository.
4. Vercel auto-detects **Vite**. Leave:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Step B3 — Set environment variables on Vercel

Before deploying, expand **Environment Variables** and add:

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | Your Project URL from Step A3 |
| `VITE_SUPABASE_ANON_KEY` | Your anon key from Step A3 |

Apply to **Production** (and Preview if you want).

> Vite bakes these into the build at compile time. If you change them later, ** redeploy**.

### Step B4 — Deploy

1. Click **Deploy**.
2. When finished, Vercel gives a URL like `https://shelfie-abc123.vercel.app`.
3. Go back to Supabase **Authentication → URL Configuration** and set **Site URL** and **Redirect URLs** to that URL (Step A4).
4. Open the Vercel URL on your phone — sign up with email + password (same account on all devices).

### Step B5 — Install as PWA (phone)

- **iPhone (Safari)**: Share → **Add to Home Screen**
- **Android (Chrome)**: Menu → **Install app** or **Add to Home Screen**

Barcode scanning and offline mode require this **HTTPS** URL (not `http://192.168.x.x`).

### Step B6 — Custom domain (optional)

1. Vercel → Project → **Settings** → **Domains** → add `shelfie.yourdomain.com`.
2. Add the DNS records Vercel shows.
3. Update Supabase **Site URL** and **Redirect URLs** to the custom domain.
4. Redeploy if you changed env vars.

---

## Path B — Self-hosted database + Vercel frontend

You run **Supabase (Postgres + Auth + Storage)** on a VPS you control. The **website** can
still live on Vercel for free HTTPS. Data sync works the same as Path A — one API, many devices.

### What you need

- A **VPS** (e.g. Hetzner, DigitalOcean, Linode) — ~$5–10/month, 2 GB RAM minimum for Supabase
- A **domain** (e.g. `api.shelfie.example.com` for Supabase, `shelfie.example.com` for the app)
- SSH access to the server

### B1 — Prepare the server

SSH in and install Docker:

```bash
# Ubuntu/Debian example
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in so docker works without sudo
```

Open firewall ports (adjust if you use a reverse proxy only):

- `80`, `443` — HTTPS (Caddy/nginx)
- Do **not** expose Postgres `5432` publicly; only the Supabase API through HTTPS

### B2 — Run self-hosted Supabase

Follow the official guide: [Supabase self-hosting with Docker](https://supabase.com/docs/guides/self-hosting/docker)

Summary:

```bash
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
# Edit .env — set strong POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY, etc.
docker compose up -d
```

Generate keys as documented in the self-hosting README. **Never commit `.env` to git.**

### B3 — Apply Shelfie schema on self-hosted Supabase

Copy your migration to the server and run it against Postgres, **or** use Studio:

1. Expose Studio temporarily (or use SSH tunnel to port 54323).
2. Open SQL editor and run [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

Or from your laptop with the DB URL:

```bash
psql "postgresql://postgres:YOUR_PASSWORD@YOUR_SERVER:5432/postgres" \
  -f supabase/migrations/0001_init.sql
```

(Prefer running SQL through Studio or tunnel — don’t expose Postgres to the internet.)

### B4 — Put HTTPS in front of the API

Browsers require HTTPS for camera/PWA. Use **Caddy** or **nginx** with Let’s Encrypt:

Example Caddyfile (`api.shelfie.example.com` → Supabase Kong gateway on port 8000):

```
api.shelfie.example.com {
    reverse_proxy localhost:8000
}
```

After DNS points to your VPS, Caddy obtains a certificate automatically.

Your frontend env vars become:

```env
VITE_SUPABASE_URL=https://api.shelfie.example.com
VITE_SUPABASE_ANON_KEY=<the ANON_KEY from your self-hosted .env>
```

### B5 — Configure auth redirect URLs (self-hosted)

Edit the self-hosted Supabase **Auth** config (in `docker/.env` / `config.toml` for GoTrue):

- `SITE_URL=https://shelfie.example.com` (your Vercel or custom frontend URL)
- `ADDITIONAL_REDIRECT_URLS=https://shelfie.example.com,https://your-app.vercel.app,http://localhost:5173`

Restart the auth container after changes.

### B6 — Deploy frontend (same as Path A, Steps B1–B5)

Use Vercel with:

```env
VITE_SUPABASE_URL=https://api.shelfie.example.com
VITE_SUPABASE_ANON_KEY=<your self-hosted anon key>
```

All devices open the Vercel URL; all data lives on **your** VPS.

### B7 — Backups (important for self-hosting)

Cloud Supabase backs up for you. Self-hosted = **you** must back up:

```bash
# Example daily cron on the VPS
docker exec supabase-db pg_dump -U postgres postgres | gzip > /backups/shelfie-$(date +%F).sql.gz
```

Store backups off-server (S3, another machine).

---

## Path C — Fully self-hosted (frontend + backend)

For maximum control, serve the built app from the same VPS (nginx/Caddy):

```bash
npm run build
# Copy dist/ to /var/www/shelfie on the server
```

Point `shelfie.example.com` to static files and `api.shelfie.example.com` to Supabase.
Set env at **build time**:

```bash
VITE_SUPABASE_URL=https://api.shelfie.example.com \
VITE_SUPABASE_ANON_KEY=your-anon-key \
npm run build
```

Rebuild and re-upload `dist/` whenever you change env or code.

---

## Local dev vs production

| | Local | Production |
|---|--------|------------|
| Database | `npm run db:start` (Docker on Mac) | Cloud or VPS Supabase |
| Frontend | `npm run dev` | Vercel or nginx |
| Env file | `.env.local` | Vercel dashboard or build-time vars |
| Phone on other Wi‑Fi | ❌ | ✅ with Path A or B |

Keep using local Supabase for development. Use production URLs only in Vercel / production builds.

---

## Multi-OS / multi-device

No separate Mac, Windows, or Android apps — one **web app**:

| Device | How to use |
|--------|------------|
| Mac, Windows, Linux | Chrome, Safari, Firefox → your HTTPS URL |
| iPhone / iPad | Safari → Add to Home Screen |
| Android | Chrome → Install app |

Same login on every device. Changes sync on next load (add book on Mac → refresh on phone).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Can't reach your library” | Database down or wrong `VITE_SUPABASE_URL`. Check VPS/docker or Supabase dashboard. |
| Login redirect loop | Add exact frontend URL to Supabase **Redirect URLs**. |
| Camera/barcode doesn’t work | Must use **HTTPS** URL, not `http://192.168.x.x`. |
| Empty library on phone but not Mac | Different accounts, or phone pointing at old/local env. |
| CORS errors | API URL must match what’s baked into the build; redeploy after env change. |

---

## Quick checklist — “works everywhere”

- [ ] Database running (Supabase Cloud **or** self-hosted VPS with HTTPS)
- [ ] `0001_init.sql` applied
- [ ] Frontend deployed with `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- [ ] Supabase Auth **Site URL** = your frontend HTTPS URL
- [ ] Redirect URLs include frontend URL and `http://localhost:5173` for dev
- [ ] Same account signed in on Mac and phone
- [ ] Open HTTPS URL on phone; test add book → appears on Mac after refresh
