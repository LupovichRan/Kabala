# Receipt Scanner (PWA)

Scan or upload a receipt → auto-crop → clean up → on-device OCR (Hebrew + English) → named PDF → filed into `Expenses/<year>/<MM-Month>/` in your Google Drive. No AI API keys, no backend. Design: [`docs/specs`](../docs/specs/2026-11-07-receipt-scanner-pwa-design.md).

Live: https://lupovichran.github.io/Kabala/ — open on Android Chrome and use **Install app**.

## One-time Drive setup (pick one)
**A – Apps Script (simplest):** open script.google.com → New project → paste `drive/apps-script/Code.gs` → Deploy → New deployment → Web app, *Execute as: Me*, *Access: Anyone with the link* → copy the URL into the app's Settings.

**B – Google sign-in:** Google Cloud Console → create an OAuth Client ID (Web), add `https://lupovichran.github.io` as an authorized JavaScript origin, enable the Drive API → paste the Client ID in Settings.

## Notes
- Uploads queue in IndexedDB and flush when you are online (History → Retry).
- OCR/OpenCV/PDF libraries load from CDNs on first use and are then cached for offline use.
- Treat the Apps Script URL as a secret; it is stored only in your browser.
- Tests: `node --test test/extract.test.mjs`
