import { loadScript, LIBS } from './lib.js';
export async function recognize(canvas, onProgress) {
  await loadScript(LIBS.tesseract);
  const worker = await Tesseract.createWorker('heb+eng', 1, { logger: m => m.status === 'recognizing text' && onProgress?.(m.progress) });
  try { const { data } = await worker.recognize(canvas); return { text: data.text, confidence: data.confidence }; }
  finally { await worker.terminate(); }
}
