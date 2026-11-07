// File + folder naming. Pure functions.
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const sanitize = s => String(s).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '');

export function makeName({ date, vendor, total }, n = 1, today = new Date()) {
  const d = date || today.toISOString().slice(0, 10);
  if (!vendor && total == null) return `${d}_Receipt_${n}.pdf`;
  const parts = [d, sanitize(vendor || 'Receipt'), total != null ? Number(total).toFixed(2) : null].filter(Boolean);
  return parts.join('_') + '.pdf';
}

export function folderPath(date, root = 'Expenses', today = new Date()) {
  const d = date || today.toISOString().slice(0, 10);
  const [y, m] = d.split('-');
  return [root, y, `${m}-${MONTH_NAMES[+m - 1]}`];
}
