# Manual E2E checklist

Flows that need a real camera, HTTPS, or multiple physical devices.

## Auth and sync
- [ ] Sign up on Mac, sign in on phone (same Wi-Fi LAN URL) — library syncs
- [ ] Sign out and back in — data persists

## Add book (Mac at home)
- [ ] Manual entry with ISBN — auto-fill from Google Books
- [ ] Barcode scan (requires HTTPS or localhost secure context)
- [ ] Cover OCR with non-English language selected
- [ ] Duplicate warning when adding same ISBN again
- [ ] Same title in different languages — both appear, related editions on detail page

## Bookshop (phone)
- [ ] Search library by ISBN while in store
- [ ] Scan ISBN from Library → duplicate toast if already owned
- [ ] Add a new purchase on the spot

## Database stopped (local dev)
- [ ] Run `npm run db:stop` — library shows “Can't reach your library”, not stale books
- [ ] Run `npm run db:start` — books reappear (data was never deleted)

## Offline
- [ ] Load library online, enable airplane mode — cached library still visible
- [ ] Attempt add offline — fails with error (expected)

## PWA / deploy
- [ ] Deploy to Vercel + Supabase cloud with HTTPS
- [ ] Install to home screen on phone
- [ ] Barcode scan works away from home Wi-Fi
