// IndexedDB upload queue + history. Item: {id, name, folder[], blob, status:'queued'|'done'|'error', error, ts}
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open('receipt-scanner', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const tx = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('items', mode), s = t.objectStore('items'), q = fn(s); t.oncomplete = () => res(q?.result); t.onerror = () => rej(t.error); }); };
export const add = item => tx('readwrite', s => s.add({ status: 'queued', ts: Date.now(), ...item }));
export const put = item => tx('readwrite', s => s.put(item));
export const all = () => tx('readonly', s => s.getAll()).then(a => a.sort((x, y) => y.ts - x.ts));
export const remove = id => tx('readwrite', s => s.delete(id));
export async function flush(upload, onChange) {
  for (const it of (await all()).filter(i => i.status !== 'done').reverse()) {
    try { await upload({ folderPath: it.folder, fileName: it.name, blob: it.blob }); it.status = 'done'; it.error = ''; }
    catch (e) { it.status = 'error'; it.error = e.message; await put(it); onChange?.(); if (!navigator.onLine) break; continue; }
    await put(it); onChange?.();
  }
}
