# Desktop app (Tauri)

Native Mac shell around the Shelfie web app. First install uses a `.dmg` from
[GitHub Releases](https://github.com/IsaacH2910/Shelfie/releases/latest).
Installed apps **auto-check** that same channel on launch (and every few hours)
and prompt to install & restart. No Apple Developer account is required for
updates (Tauri signs the updater payload separately).

## Prerequisites (macOS)

- [Rust](https://www.rust-lang.org/tools/install) (`rustc`, `cargo`)
- Xcode or Xcode Command Line Tools
- Node.js + `npm install`

## Dev

```bash
npm run desktop:dev
```

Opens a native window against the Vite dev server (`http://localhost:5173`).
ISBN lookup uses the local Vite `/api` proxy. Sign in with **email + password**
(Google OAuth / magic links need extra deep-link work in the shell).

## Env for release builds

Vite bakes `VITE_*` values into the binary. For a packaged app set in
`.env.local` (or your CI secrets):

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Cloud Supabase |
| `VITE_SUPABASE_ANON_KEY` | Yes | Client auth |
| `VITE_PUBLIC_APP_URL` | Yes (desktop release) | Deployed site origin so `/api/book-lookup` hits Vercel |
| `VITE_GOOGLE_BOOKS_API_KEY` | Optional | Better Google Books quota |

Updater signing (required when `createUpdaterArtifacts` is on):

| Variable | Purpose |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | Private key **contents** (preferred; required for signing updater artifacts) |
| `TAURI_SIGNING_PRIVATE_KEY_PATH` | Optional path alternative (some environments ignore this) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Only if the key was created with a password |

Example:

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat src-tauri/keys/shelfie.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
npm run desktop:build
```

The **public** key is already in [`src-tauri/tauri.conf.json`](../src-tauri/tauri.conf.json).
The **private** key must never be committed (gitignored under `src-tauri/keys/*.key`).

## Build a Mac `.dmg`

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat src-tauri/keys/shelfie.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
npm run desktop:build
```

Or:

```bash
npm run desktop:build:signed
```

Artifacts land in:

```
src-tauri/target/release/bundle/macos/Shelfie.app
src-tauri/target/release/bundle/dmg/Shelfie_*.dmg
src-tauri/target/release/bundle/macos/Shelfie.app.tar.gz   # updater payload
src-tauri/target/release/bundle/macos/Shelfie.app.tar.gz.sig
```

### First-time install (unsigned)

This build is **not** Apple-signed. Recipients may need:

1. Open the `.dmg` and drag **Shelfie** to Applications
2. Right-click **Shelfie** → **Open** (or System Settings → Privacy & Security → Open Anyway)

After that, updates install in-app from GitHub Releases (no new Gatekeeper prompt
for each update when replacing via the Tauri updater).

## Online distribution & auto-update

Distribution channel: **GitHub Releases** →
`https://github.com/IsaacH2910/Shelfie/releases/latest/download/latest.json`

Client behavior (Tauri builds only):

1. ~4s after launch, and every 6 hours while open, Shelfie checks `latest.json`
2. If a newer version exists, a dialog offers **Install & restart** or **Later**
3. **Later** skips that version until the next release (or until Settings → Check for updates)
4. Settings → Desktop still has a manual check (clears a skipped version)

### Ship an update

1. Bump `version` in both [`src-tauri/tauri.conf.json`](../src-tauri/tauri.conf.json) and [`src-tauri/Cargo.toml`](../src-tauri/Cargo.toml)
2. Rebuild with the signing key:
   ```bash
   npm run desktop:build:signed
   ```
3. Generate updater manifest:
   ```bash
   npm run desktop:latest-json -- 0.1.2 "What changed"
   ```
4. Create a [GitHub Release](https://github.com/IsaacH2910/Shelfie/releases) tagged `v0.1.2` and upload:
   - `Shelfie_*.dmg` — first-time installers
   - `Shelfie.app.tar.gz` + `Shelfie.app.tar.gz.sig` — updater payload
   - `latest.json` — from step 3 (must be named exactly `latest.json`)

Installed apps pick it up on next launch (or within ~6 hours).

### `latest.json` shape

```json
{
  "version": "0.1.2",
  "notes": "Bug fixes",
  "pub_date": "2026-07-22T00:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "<contents of Shelfie.app.tar.gz.sig>",
      "url": "https://github.com/IsaacH2910/Shelfie/releases/download/v0.1.2/Shelfie.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "<contents of Shelfie.app.tar.gz.sig>",
      "url": "https://github.com/IsaacH2910/Shelfie/releases/download/v0.1.2/Shelfie.app.tar.gz"
    }
  }
}
```

Endpoint used by the app:

`https://github.com/IsaacH2910/Shelfie/releases/latest/download/latest.json`

### What does *not* need a desktop rebuild

- Supabase schema / data
- Vercel `/api/book-lookup` changes

Those are live cloud services the desktop app already talks to.

Manual fallback: send a new `.dmg` and replace `/Applications/Shelfie.app`.

## Camera

macOS will ask for camera access for barcode / cover scan. The usage string lives
in [`src-tauri/Info.plist`](../src-tauri/Info.plist).

## Future: Gatekeeper-ready (Apple Developer)

When you have an Apple Developer Program account:

1. Create a **Developer ID Application** certificate
2. Set `bundle.macOS.signingIdentity` in `tauri.conf.json` (or env `APPLE_SIGNING_IDENTITY`)
3. Notarize with Apple ID / app-specific password / team ID env vars (see [Tauri macOS code signing](https://v2.tauri.app/distribute/sign-macos/))
4. Rebuild — recipients can open the `.dmg` without right-click → Open

Updater signing (Tauri keypair) stays separate from Apple code signing.

## Windows / Linux

Same Tauri project. Build on each OS later (`msi`/`nsis`, `deb`/`appimage`). Updater
endpoints can gain `windows-x86_64` / `linux-x86_64` platform keys in `latest.json`.
