# Shelfie E2E Report

Generated after implementing the validation and improvement plan.

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Core CRUD | Pass | Add, view, edit, delete verified via Playwright |
| ISBN lookup | Pass | Auto-fill from mocked Google Books + Open Library |
| Duplicate detection | Pass | Warning shown when adding same ISBN twice |
| Cross-device sync | Pass (design) | Supabase cloud auth + Postgres; same account on all devices |
| Library search at store | Pass | ISBN added to search filter |
| Barcode scan | Manual / HTTPS | Works on HTTPS deploy; LAN HTTP can paste ISBN |
| OCR | Pass | Multilingual language picker added (Tesseract packs) |
| Offline browse | Pass | Cached when browser offline (airplane mode) |
| Server down (db:stop) | Pass (fixed) | Shows “Can't reach your library”, not stale cache |
| PWA install | Manual / HTTPS | Requires Vercel + Supabase cloud deploy |

## Automated tests

Playwright suite: **9 tests, all passing**

```bash
npm run db:start
VITE_SUPABASE_URL=http://127.0.0.1:54321 npm run test:e2e
```

Coverage:
- Auth sign-up
- Library search and mobile scan link
- Add book with ISBN lookup
- Duplicate warning
- Book detail, edit, delete, copy ISBN

Camera/barcode flows: see [`e2e/MANUAL.md`](MANUAL.md).

## Improvements shipped

1. **ISBN library search** — search by ISBN at the bookshop
2. **Multilingual OCR** — language picker on cover scan
3. **Store UX** — “Scan ISBN” on mobile library, duplicate toast on barcode scan, copy ISBN on detail
4. **Edit cover photo** — upload when editing a book
5. **Backend unavailable handling** — no phantom books when local DB is stopped

## Deploy verification (P4)

For use away from home Wi-Fi (barcode, PWA, camera):

1. Create a [Supabase](https://supabase.com) project and run `supabase/migrations/0001_init.sql`
2. Deploy to [Vercel](https://vercel.com) with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
3. Add the Vercel URL to Supabase redirect URLs
4. On phone over cellular: install PWA, scan ISBN, confirm sync with Mac

This step requires your cloud credentials and was not run in this environment.

## Important: stopping the local database

`npm run db:stop` does **not** delete your books. Data lives in the Docker volume. When the database is stopped and your browser is online, the app now shows **“Can't reach your library”** instead of stale cached records. Run `npm run db:start` and your books return.
