import { fileToCanvases } from './capture.js';
import { detectCorners, fullFrame, warp, cornerEditor } from './crop.js';
import { enhance } from './enhance.js';
import { recognize } from './ocr.js';
import { extractAll } from './extract.js';
import { makeName, folderPath } from './namer.js';
import { makePdf } from './pdf.js';
import { getSettings, saveSettings } from './settings.js';
import * as queue from './queue.js';
import { driveFor } from './drive/index.js';

const $ = id => document.getElementById(id);
const show = id => ['s-start', 's-crop', 's-review'].forEach(s => $(s).classList.toggle('hidden', s !== id));
const msg = (t, err) => { $('msg').textContent = t || ''; $('msg').className = err ? 'err' : ''; };

let raw = [], cropped = [], idx = 0, editor = null, counter = +(localStorage.getItem('rs-counter') || 0);

async function startCrop(base = []) { idx = 0; cropped = base; await cropNext(); }
async function cropNext() {
  if (idx >= raw.length) return review();
  show('s-crop'); $('crop-pg').textContent = raw.length > 1 ? `(page ${idx + 1}/${raw.length})` : '';
  msg('Detecting edges…');
  const c = raw[idx];
  editor = cornerEditor($('crop-host'), c, fullFrame(c));
  detectCorners(c).then(corners => { editor = cornerEditor($('crop-host'), c, corners); msg('Drag the corners if needed.'); }).catch(() => msg('Auto-detect unavailable; adjust manually.'));
}
$('crop-reset').onclick = () => { editor = cornerEditor($('crop-host'), raw[idx], fullFrame(raw[idx])); };
$('crop-ok').onclick = async () => { cropped.push(await warp(raw[idx], editor.getCorners())); idx++; await cropNext(); };

let pages = [], fields = {};
function renderThumbs() { $('thumbs').replaceChildren(...pages.map(p => { const c = document.createElement('canvas'); c.width = p.width; c.height = p.height; c.getContext('2d').drawImage(p, 0, 0); return c; })); }
function refreshName() {
  const date = $('f-date').value || null, vendor = $('f-vendor').value.trim(), total = parseFloat($('f-total').value.replace(',', '.'));
  $('f-name').value = makeName({ date, vendor: vendor || null, total: isNaN(total) ? null : total }, counter + 1);
  $('f-folder').textContent = '📁 ' + folderPath(date, getSettings().root).join(' / ');
}
async function review() {
  show('s-review'); $('f-mode').value = getSettings().color;
  pages = cropped.map(c => enhance(c, $('f-mode').value)); renderThumbs();
  for (const k of ['vendor', 'date', 'total']) $('f-' + k).value = '';
  refreshName(); msg('Reading receipt…');
  try {
    const { text } = await recognize(pages[0], p => msg(`Reading receipt… ${Math.round(p * 100)}%`));
    const r = extractAll(text);
    $('f-vendor').value = r.vendor || ''; $('f-date').value = r.date || ''; $('f-total').value = r.total ?? '';
    msg(r.vendor || r.date || r.total != null ? 'Check the details, then save.' : 'Nothing recognised – fill in the details.', !(r.vendor || r.date || r.total != null));
  } catch { msg('OCR unavailable (offline?) – fill in the details.', true); }
  refreshName();
}
['f-vendor', 'f-date', 'f-total'].forEach(id => $(id).addEventListener('input', refreshName));
$('f-mode').onchange = () => { pages = cropped.map(c => enhance(c, $('f-mode').value)); renderThumbs(); };
$('btn-cancel').onclick = () => { raw = cropped = pages = []; show('s-start'); msg(''); };
$('btn-addpage').onclick = () => $('in-file').click();

$('btn-save').onclick = async () => {
  $('btn-save').disabled = true;
  try {
    const blob = await makePdf(pages), date = $('f-date').value || null;
    localStorage.setItem('rs-counter', ++counter);
    await queue.add({ name: $('f-name').value || makeName({}, counter), folder: folderPath(date, getSettings().root), blob });
    raw = cropped = pages = []; show('s-start'); msg('Saved. Uploading…');
    await flush(); await renderHist();
  } catch (e) { msg(e.message, true); } finally { $('btn-save').disabled = false; }
};

async function flush() {
  const s = getSettings();
  await queue.flush(driveFor(s), renderHist);
  const left = (await queue.all()).filter(i => i.status !== 'done');
  msg(left.length ? `${left.length} waiting – ${left[0].error || 'offline'}` : 'Uploaded ✔', !!left.length && !!left[0].error);
}
async function renderHist() {
  const items = await queue.all();
  $('hist').replaceChildren(...(items.length ? items : [{ name: 'Nothing yet', status: '' }]).map(i => {
    const d = document.createElement('div'); d.className = 'item';
    const a = document.createElement('span'); a.textContent = i.name;
    const b = document.createElement('span'); b.className = 'st-' + i.status; b.textContent = i.status === 'done' ? '✔ uploaded' : i.status === 'error' ? 'retry: ' + (i.error || '') : i.status === 'queued' ? 'queued' : '';
    d.append(a, b); return d;
  }));
}
$('btn-hist').onclick = async () => { await renderHist(); $('s-hist').classList.toggle('hidden'); };
$('btn-retry').onclick = flush;
window.addEventListener('online', flush);

async function onFiles(files) {
  if (!files.length) return;
  msg('Loading…');
  try {
    const add = (await Promise.all([...files].map(fileToCanvases))).flat();
    const base = $('s-review').classList.contains('hidden') ? [] : cropped.slice();
    raw = add; await startCrop(base);
  } catch (e) { msg('Could not open file: ' + e.message, true); }
}
$('in-cam').onchange = e => { onFiles(e.target.files); e.target.value = ''; };
$('in-file').onchange = e => { onFiles(e.target.files); e.target.value = ''; };

const dlg = $('dlg'), sync = () => { $('s-a').classList.toggle('hidden', $('s-method').value !== 'appsScript'); $('s-b').classList.toggle('hidden', $('s-method').value !== 'google'); };
$('s-method').onchange = sync;
$('btn-set').onclick = () => { const s = getSettings(); $('s-method').value = s.method; $('s-endpoint').value = s.endpoint; $('s-client').value = s.clientId; $('s-root').value = s.root; $('s-color').value = s.color; sync(); dlg.showModal(); };
$('s-save').onclick = () => saveSettings({ method: $('s-method').value, endpoint: $('s-endpoint').value.trim(), clientId: $('s-client').value.trim(), root: $('s-root').value.trim() || 'Expenses', color: $('s-color').value });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
