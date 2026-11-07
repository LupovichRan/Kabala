// Lazy loader for third-party libs (cached by the service worker after first use).
const loaded = {};
export function loadScript(src) {
  return loaded[src] ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => { delete loaded[src]; rej(new Error('Failed to load ' + src)); };
    document.head.appendChild(s);
  });
}
export const LIBS = {
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  pdfjs: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  pdfjsWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  tesseract: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
  opencv: 'https://docs.opencv.org/4.9.0/opencv.js',
  gis: 'https://accounts.google.com/gsi/client',
};
