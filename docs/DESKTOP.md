# Desktop app (Tauri)

Native Mac shell around the Shelfie web app. First install uses a `.dmg`.
Later versions update in-app from GitHub Releases (no Apple Developer account
required for updates).

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

## Ship an update

The `.dmg` embeds the frontend at build time. After you change UI/client code:

1. Bump `version` in both [`src-tauri/tauri.conf.json`](../src-tauri/tauri.conf.json) and [`src-tauri/Cargo.toml`](../src-tauri/Cargo.toml)
2. Rebuild with the signing key env set (same as above)
3. Create a [GitHub Release](https://github.com/IsaacH2910/Shelfie/releases) and upload:
   - `Shelfie_*.dmg` — first-time installers
   - `Shelfie.app.tar.gz` + `Shelfie.app.tar.gz.sig` — updater payload
   - `latest.json` — see template below
4. Installed apps: **Settings → Desktop → Check for updates**

### `latest.json` template

Replace version, dates, URLs, and paste the `.sig` file contents into `signature`:

```json
{
  "version": "0.1.1",
  "notes": "Bug fixes",
  "pub_date": "2026-07-17T00:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "<contents of Shelfie.app.tar.gz.sig>",
      "url": "https://github.com/IsaacH2910/Shelfie/releases/download/v0.1.1/Shelfie.app.tar.gz"
    },
    "darwin-x86_64": {
      "signature": "<contents of Shelfie.app.tar.gz.sig>",
      "url": "https://github.com/IsaacH2910/Shelfie/releases/download/v0.1.1/Shelfie.app.tar.gz"
    }
  }
}
```

Name the asset exactly `latest.json` and attach it to the **latest** release (or keep a dedicated latest tag) so this endpoint works:

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
