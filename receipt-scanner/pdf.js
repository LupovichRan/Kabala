import { loadScript, LIBS } from './lib.js';
export async function makePdf(canvases) {
  await loadScript(LIBS.jspdf);
  const { jsPDF } = window.jspdf;
  let doc;
  canvases.forEach((c, i) => {
    const o = c.width > c.height ? 'l' : 'p';
    if (i === 0) doc = new jsPDF({ orientation: o, unit: 'px', format: [c.width, c.height], hotfixes: ['px_scaling'] });
    else doc.addPage([c.width, c.height], o);
    doc.addImage(c.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, c.width, c.height);
  });
  return doc.output('blob');
}
