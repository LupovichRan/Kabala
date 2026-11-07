# Receipt Scanner PWA — Design

## Goal
Installable Android-friendly web app (PWA) that scans/uploads receipts and invoices, auto-crops them, auto-names the PDF, and files it into a monthly Google Drive folder (`Expenses/<year>/<MM-Month>/`). No AI API keys; all "AI" runs on-device and is free.

## Non-goals
Cloud LLMs, accounting/export features, multi-user accounts, native APK (a Capacitor wrapper can come later).

## Success criteria
- Photo -> cropped, cleaned, named PDF in the correct Drive month folder in under ~10 s on a mid-range phone.
- Works offline for scanning; uploads queue and flush when online.
- Name is editable before upload; wrong guesses cost one tap, not a re-scan.

## Architecture (static files only, no backend)
Location: `receipt-scanner/` (index.html, app.js, modules, sw.js, manifest.webmanifest, icons). Deploy as static site (Netlify/GitHub Pages).

Modules, each with one purpose:
- `capture.js` — camera (`getUserMedia`/file input), gallery, PDF/image import (pdf.js renders PDF pages to images).
- `crop.js` — OpenCV.js: grayscale, blur, Canny, largest 4-point contour, perspective warp. Returns corners; manual corner-drag UI overrides. Falls back to full frame if no contour found.
- `enhance.js` — scanner cleanup (adaptive threshold / contrast / sharpen), toggle color vs B&W.
- `ocr.js` — Tesseract.js (heb+eng), lazy-loaded and cached by the service worker.
- `extract.js` — pure functions: vendor (top-most prominent line, cleaned), date (dd/mm/yyyy, dd.mm.yy, ISO, month names, Hebrew), total (largest amount near "סה"כ/Total/לתשלום/Amount due). Unit-tested with fixture OCR text.
- `namer.js` — `YYYY-MM-DD_Vendor_Total.pdf`, sanitized; fallback `YYYY-MM-DD_Receipt_<n>.pdf`.
- `pdf.js` — jsPDF; multi-page support.
- `drive/` — interface `upload({folderPath, fileName, blob})`, two adapters:
  - `appsScript.js` (method A): POST to user's deployed Apps Script web-app URL. Script (shipped in `drive/apps-script/Code.gs`) creates folder path under a root folder and saves the file as the user.
  - `googleSignIn.js` (method B): Google Identity Services token flow + Drive REST v3; user supplies their OAuth Client ID in Settings; creates/finds folders by name, then multipart upload. Scope `drive.file`.
- `queue.js` — IndexedDB upload queue + history; retry with backoff.
- `settings.js` — Drive method, endpoint URL / client ID, root folder name, folder pattern, color mode. Stored in localStorage.
- `sw.js` — precache shell + OCR/OpenCV assets.

## Data flow
capture -> crop (review/adjust corners) -> enhance -> OCR -> extract -> namer (editable preview) -> pdf -> queue -> drive adapter -> history.

## Error handling
- No contour: full image + manual corners.
- OCR low confidence / nothing found: fallback name, highlight fields for edit.
- Upload failure/offline: stays in queue, visible status, retry button.
- Drive auth errors: clear message pointing to Settings.

## Privacy
Images and OCR never leave the device except the final PDF sent to the user's own Drive. No third-party AI calls. Apps Script URL is treated as a secret (not logged).

## Testing
- Unit tests (Node) for `extract.js` and `namer.js` with Hebrew/English fixtures.
- Playwright smoke test: load app, inject sample receipt image, verify crop output, name suggestion, and queued upload against a mocked Drive endpoint.
- Manual checklist for real Drive upload for both methods (needs the user's credentials).

## Setup the user must do once (cannot be automated)
- Method A: paste `Code.gs` into script.google.com, Deploy as web app (execute as me, access: anyone with link), paste URL into Settings.
- Method B: create Google Cloud OAuth Client ID (Web, authorized JS origin = app URL), paste into Settings.
Step-by-step instructions will be in `receipt-scanner/README.md`.

## Known limits
On-device OCR is less accurate than cloud models, especially on crumpled or faded Hebrew receipts; the edit-before-upload step is the mitigation. AI layer is behind `extract.js`/`ocr.js` so a cloud provider could be added later.
