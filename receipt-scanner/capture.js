import { loadScript, LIBS } from './lib.js';
// Turn a File (image or PDF) into canvases (one per page).
export async function fileToCanvases(file) {
  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    await loadScript(LIBS.pdfjs);
    pdfjsLib.GlobalWorkerOptions.workerSrc = LIBS.pdfjsWorker;
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const out = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 2 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      out.push(c);
    }
    return out;
  }
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const max = 2200, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return [c];
}
