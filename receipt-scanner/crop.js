import { loadScript, LIBS } from './lib.js';
// Corners are [tl,tr,br,bl] in canvas pixels. Auto-detect uses OpenCV.js (lazy); falls back to full frame.
export const fullFrame = c => [[0, 0], [c.width, 0], [c.width, c.height], [0, c.height]];

async function cvReady() {
  await loadScript(LIBS.opencv);
  if (cv.Mat) return;
  await new Promise(r => { cv.onRuntimeInitialized = r; });
}

function order(pts) {
  const s = pts.map(p => p[0] + p[1]), d = pts.map(p => p[0] - p[1]);
  return [pts[s.indexOf(Math.min(...s))], pts[d.indexOf(Math.max(...d))], pts[s.indexOf(Math.max(...s))], pts[d.indexOf(Math.min(...d))]];
}

export async function detectCorners(canvas) {
  try { await cvReady(); } catch { return fullFrame(canvas); }
  const src = cv.imread(canvas), gray = new cv.Mat(), edges = new cv.Mat(), contours = new cv.MatVector(), hier = new cv.Mat();
  try {
    const scale = 600 / Math.max(canvas.width, canvas.height);
    cv.resize(src, src, new cv.Size(0, 0), scale, scale);
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 0);
    cv.Canny(gray, edges, 60, 160);
    cv.dilate(edges, edges, cv.Mat.ones(3, 3, cv.CV_8U));
    cv.findContours(edges, contours, hier, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    let best = null, bestArea = src.rows * src.cols * 0.15;
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i), peri = cv.arcLength(cnt, true), approx = new cv.Mat();
      cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
      const area = cv.contourArea(approx);
      if (approx.rows === 4 && area > bestArea && cv.isContourConvex(approx)) {
        bestArea = area; best = [];
        for (let j = 0; j < 4; j++) best.push([approx.intPtr(j, 0)[0] / scale, approx.intPtr(j, 0)[1] / scale]);
      }
      approx.delete(); cnt.delete();
    }
    return best ? order(best) : fullFrame(canvas);
  } finally { src.delete(); gray.delete(); edges.delete(); contours.delete(); hier.delete(); }
}

// Perspective warp: OpenCV if available, otherwise bounding-box crop.
export async function warp(canvas, corners) {
  const [tl, tr, br, bl] = corners, dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const w = Math.round(Math.max(dist(tl, tr), dist(bl, br))), h = Math.round(Math.max(dist(tl, bl), dist(tr, br)));
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const isFull = corners.every((p, i) => p[0] === fullFrame(canvas)[i][0] && p[1] === fullFrame(canvas)[i][1]);
  if (isFull) { out.width = canvas.width; out.height = canvas.height; out.getContext('2d').drawImage(canvas, 0, 0); return out; }
  try {
    await cvReady();
    const src = cv.imread(canvas), dst = new cv.Mat();
    const a = cv.matFromArray(4, 1, cv.CV_32FC2, corners.flat()), b = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, w, 0, w, h, 0, h]);
    const M = cv.getPerspectiveTransform(a, b);
    cv.warpPerspective(src, dst, M, new cv.Size(w, h));
    cv.imshow(out, dst);
    [src, dst, a, b, M].forEach(m => m.delete());
  } catch {
    const xs = corners.map(p => p[0]), ys = corners.map(p => p[1]);
    const x = Math.min(...xs), y = Math.min(...ys), bw = Math.max(...xs) - x, bh = Math.max(...ys) - y;
    out.width = bw; out.height = bh; out.getContext('2d').drawImage(canvas, x, y, bw, bh, 0, 0, bw, bh);
  }
  return out;
}

// Drag-handle UI. Returns {getCorners, destroy}.
export function cornerEditor(host, canvas, corners) {
  const wrap = document.createElement('div'); wrap.className = 'cropwrap';
  const view = document.createElement('canvas'); view.width = canvas.width; view.height = canvas.height;
  view.getContext('2d').drawImage(canvas, 0, 0);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);
  const poly = document.createElementNS(svg.namespaceURI, 'polygon'); svg.appendChild(poly);
  const r = Math.max(canvas.width, canvas.height) * 0.02;
  const handles = corners.map((_, i) => { const c = document.createElementNS(svg.namespaceURI, 'circle'); c.setAttribute('r', r); svg.appendChild(c); c.dataset.i = i; return c; });
  const draw = () => { poly.setAttribute('points', corners.map(p => p.join(',')).join(' ')); handles.forEach((h, i) => { h.setAttribute('cx', corners[i][0]); h.setAttribute('cy', corners[i][1]); }); };
  let active = null;
  svg.addEventListener('pointerdown', e => { if (e.target.dataset.i) { active = +e.target.dataset.i; svg.setPointerCapture(e.pointerId); } });
  svg.addEventListener('pointermove', e => {
    if (active == null) return;
    const b = svg.getBoundingClientRect(), k = canvas.width / b.width;
    corners[active] = [Math.max(0, Math.min(canvas.width, (e.clientX - b.left) * k)), Math.max(0, Math.min(canvas.height, (e.clientY - b.top) * k))];
    draw();
  });
  svg.addEventListener('pointerup', () => { active = null; });
  draw(); wrap.append(view, svg); host.replaceChildren(wrap);
  return { getCorners: () => corners.map(p => [...p]) };
}
