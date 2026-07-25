# Changelog

## 0.1.3 — 2026-07-26

Pre-release hardening and QA pass for the macOS desktop installer.

### Security
- Set a restrictive Content Security Policy for the Tauri webview
- Restrict `/api/book-lookup` CORS to app, local, and Tauri origins (removed `*`)
- Add per-IP rate limiting for book lookup and admin unlock
- Add failed-attempt lockout on admin unlock
- Wire Zod validation for book drafts, auth credentials, and JSON import
- Remove unused `react-hook-form` / `@hookform/resolvers` dependencies
- Align npm package version with the desktop app

### Testing
- Expand Playwright coverage: offline banner + cached library, offline save errors, barcode assist ISBN lookup / invalid digits, multi-device library sync
- Enable fake camera permissions for headless barcode UI flows

### Build
- Production signed macOS `.dmg` + updater artifacts for `v0.1.3`

## 0.1.2 — 2026-07-22

- Auto-check for updates on launch from GitHub Releases
- Prompt to install & restart, or skip until the next version
- Download page links to the latest Mac `.dmg`
