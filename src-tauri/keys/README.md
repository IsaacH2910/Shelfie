# Updater signing keys

- `shelfie.key.pub` — public key (safe to commit; also embedded in `tauri.conf.json`)
- `shelfie.key` — **private** key (gitignored). Keep a backup offline.
  If you lose it, existing installs cannot verify new updates and you must
  generate a new keypair and ship a fresh `.dmg`.

Generate a replacement with:

```bash
npx tauri signer generate -w src-tauri/keys/shelfie.key
```

Then update `plugins.updater.pubkey` in `tauri.conf.json` with the new `.pub` contents.
