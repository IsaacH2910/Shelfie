# Changelog

## 1.0.0 — 2026-07-26

First stable macOS release after pre-release audit, security hardening, and E2E coverage.

### Security
- Restrictive Content Security Policy for the Tauri webview
- Restrict `/api/book-lookup` CORS to app, local, and Tauri origins
- Per-IP rate limiting for book lookup and admin unlock
- Failed-attempt lockout on admin unlock
- Zod validation for book drafts, auth credentials, and JSON import
- Remove unused `react-hook-form` / `@hookform/resolvers`

### Testing
- Playwright: offline banner + cached library, offline save errors
- Barcode assist ISBN lookup / invalid digits
- Multi-device library sync
- Fake camera permissions for headless barcode UI

### Build
- Signed macOS `.dmg` + updater artifacts for `v1.0.0`

## 0.1.2 — 2026-07-22

- Auto-check for updates on launch from GitHub Releases
- Prompt to install & restart, or skip until the next version
- Download page links to the latest Mac `.dmg`
