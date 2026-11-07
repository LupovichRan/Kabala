const C = 'receipts-v1', SHELL = ['./', 'index.html', 'app.js', 'lib.js', 'capture.js', 'crop.js', 'enhance.js', 'ocr.js', 'extract.js', 'namer.js', 'pdf.js', 'queue.js', 'settings.js', 'drive/index.js', 'drive/appsScript.js', 'drive/googleSignIn.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const LIB = /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|docs\.opencv\.org|tessdata|\.traineddata/;
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin === location.origin) { // network-first, cache fallback
    e.respondWith(fetch(e.request).then(r => { const k = r.clone(); caches.open(C).then(c => c.put(e.request, k)); return r; }).catch(() => caches.match(e.request)));
  } else if (LIB.test(e.request.url)) { // heavy libs: cache-first
    e.respondWith(caches.match(e.request).then(h => h || fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') { const k = r.clone(); caches.open(C).then(c => c.put(e.request, k)); } return r; })));
  }
});
