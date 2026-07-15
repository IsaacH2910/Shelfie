# Manual E2E checklist

Flows that need a real camera, HTTPS, or multiple devices. Automated coverage lives in the Playwright specs in this folder (`npm run test:e2e`).

## Auth and sync

- [ ] Sign up on one device, sign in on another — library syncs
- [ ] Sign out and back in — data persists

## Add book

- [ ] Manual entry with ISBN — auto-fill from lookup
- [ ] Barcode scan (requires HTTPS or a secure context)
- [ ] Cover OCR with a non-English language selected
- [ ] Duplicate warning when adding the same ISBN again
- [ ] Same title in different languages — both appear; related editions on the detail page

## On the go

- [ ] Search the library by ISBN
- [ ] Scan ISBN from Library — duplicate toast if already owned
- [ ] Add a new book on the spot

## Local database stopped

- [ ] `npm run db:stop` — library shows “Can't reach your library”, not stale books
- [ ] `npm run db:start` — books reappear (Docker volume was never wiped)

## Offline

- [ ] Load library online, enable airplane mode — cached library still visible
- [ ] Attempt add offline — fails with an error (expected)

## PWA / deploy

- [ ] Deploy with HTTPS (see [`docs/DEPLOY.md`](../docs/DEPLOY.md))
- [ ] Install to home screen on a phone
- [ ] Barcode scan works away from the home network
