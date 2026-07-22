#!/usr/bin/env bash
# Write Tauri updater latest.json from the last signed Mac build.
# Usage:
#   bash scripts/write-latest-json.sh [version] [notes]
# Example:
#   bash scripts/write-latest-json.sh 0.1.2 "Bug fixes and auto-update"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUNDLE="$ROOT/src-tauri/target/release/bundle"
TAR="$BUNDLE/macos/Shelfie.app.tar.gz"
SIG="$BUNDLE/macos/Shelfie.app.tar.gz.sig"
OUT="$BUNDLE/latest.json"
REPO="${GITHUB_REPO:-IsaacH2910/Shelfie}"

VERSION="${1:-}"
NOTES="${2:-Shelfie desktop update}"

if [[ -z "$VERSION" ]]; then
  VERSION="$(node -e "console.log(require('$ROOT/src-tauri/tauri.conf.json').version)")"
fi

if [[ ! -f "$TAR" || ! -f "$SIG" ]]; then
  echo "Missing updater artifacts. Run: npm run desktop:build:signed" >&2
  exit 1
fi

export SHELFIE_LATEST_VERSION="$VERSION"
export SHELFIE_LATEST_NOTES="$NOTES"
export SHELFIE_LATEST_SIG="$SIG"
export SHELFIE_LATEST_OUT="$OUT"
export SHELFIE_LATEST_REPO="$REPO"

node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from 'node:fs'

const version = process.env.SHELFIE_LATEST_VERSION
const notes = process.env.SHELFIE_LATEST_NOTES || 'Shelfie desktop update'
const sigPath = process.env.SHELFIE_LATEST_SIG
const out = process.env.SHELFIE_LATEST_OUT
const repo = process.env.SHELFIE_LATEST_REPO

const signature = readFileSync(sigPath, 'utf8').replace(/\r/g, '').trim()
const pub_date = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
const url = `https://github.com/${repo}/releases/download/v${version}/Shelfie.app.tar.gz`

const doc = {
  version,
  notes,
  pub_date,
  platforms: {
    'darwin-aarch64': { signature, url },
    'darwin-x86_64': { signature, url },
  },
}

writeFileSync(out, JSON.stringify(doc, null, 2) + '\n')
console.log('Wrote', out)
console.log(`Upload DMG + .tar.gz + .sig + latest.json to GitHub release v${version}`)
JS
