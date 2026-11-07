// Scanner-style cleanup in pure canvas code (no OpenCV needed).
export function enhance(canvas, mode = 'color') {
  const out = document.createElement('canvas'); out.width = canvas.width; out.height = canvas.height;
  const ctx = out.getContext('2d'); ctx.drawImage(canvas, 0, 0);
  const img = ctx.getImageData(0, 0, out.width, out.height), d = img.data, w = out.width, h = out.height;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i++) gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  if (mode === 'bw') {
    const I = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += gray[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; } }
    const r = Math.max(8, Math.round(Math.min(w, h) / 30));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1), y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
      const sum = I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0];
      const v = gray[y * w + x] * (x1 - x0) * (y1 - y0) < sum * 0.92 ? 0 : 255, o = (y * w + x) * 4;
      d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255;
    }
  } else {
    const hist = new Uint32Array(256); gray.forEach(v => hist[v | 0]++);
    const cut = gray.length * 0.01; let lo = 0, hi = 255, acc = 0;
    while (lo < 255 && (acc += hist[lo]) < cut) lo++;
    acc = 0; while (hi > 0 && (acc += hist[hi]) < cut) hi--;
    const k = 255 / Math.max(1, hi - lo);
    for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = Math.max(0, Math.min(255, (d[i + c] - lo) * k));
  }
  ctx.putImageData(img, 0, 0);
  return out;
}
