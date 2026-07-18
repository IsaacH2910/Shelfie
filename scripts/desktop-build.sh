#!/usr/bin/env bash
# Build Shelfie desktop with updater signing.
# Usage: npm run desktop:build:signed
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY="$ROOT/src-tauri/keys/shelfie.key"
if [[ ! -f "$KEY" ]]; then
  echo "Missing updater private key at $KEY" >&2
  echo "Generate with: npx tauri signer generate -w src-tauri/keys/shelfie.key" >&2
  exit 1
fi

# Shell VITE_* overrides beat .env.local in Vite. Clear local/dev leaks so the
# packaged app bakes production values from .env.local / env files.
unset VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_PUBLIC_APP_URL

# Fail fast if production bake would still point at local Supabase.
HOST="$(node --input-type=module <<'JS'
import { loadEnv } from 'vite'
const env = loadEnv('production', process.cwd(), '')
const url = env.VITE_SUPABASE_URL || ''
process.stdout.write(url.replace(/^https?:\/\//, '').split('/')[0] || '')
JS
)"
if [[ -z "$HOST" || "$HOST" == 127.0.0.1* || "$HOST" == localhost* || "$HOST" == 192.168.* ]]; then
  echo "Refusing desktop build: VITE_SUPABASE_URL resolves to local host ($HOST)." >&2
  echo "Put cloud Supabase credentials in .env.local and unset shell VITE_* overrides." >&2
  exit 1
fi
if [[ -z "$(node --input-type=module <<'JS'
import { loadEnv } from 'vite'
const env = loadEnv('production', process.cwd(), '')
process.stdout.write(env.VITE_PUBLIC_APP_URL || '')
JS
)" ]]; then
  echo "Refusing desktop build: VITE_PUBLIC_APP_URL is missing (needed for ISBN lookup)." >&2
  exit 1
fi
echo "Desktop bake OK — Supabase host: $HOST"

export TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY="$(cat "$KEY")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}"
export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$ROOT/src-tauri/target}"
cd "$ROOT"
exec npx tauri build "$@"
