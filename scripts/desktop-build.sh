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
export TAURI_SIGNING_PRIVATE_KEY
TAURI_SIGNING_PRIVATE_KEY="$(cat "$KEY")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}"
export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$ROOT/src-tauri/target}"
cd "$ROOT"
exec npx tauri build "$@"
