// Pure functions: pull vendor / date / total out of OCR text (Hebrew + English).
const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'מרס': 3, 'אפריל': 4, 'מאי': 5, 'יוני': 6, 'יולי': 7, 'אוגוסט': 8, 'ספטמבר': 9, 'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12,
};
const TOTAL_KEYS = /(סה["״']?כ|סך הכל|סך הכול|לתשלום|total|amount due|grand total|balance due|sum)/i;
const AMOUNT_RE = /\d{1,3}(?:[,.]\d{3})+[.,]\d{2}|\d+[.,]\d{2}/g;

export function parseAmount(s) {
  s = String(s).trim();
  const m = s.match(/^(.*)[.,](\d{2})$/);
  if (!m) return NaN;
  return parseFloat(m[1].replace(/[.,]/g, '') + '.' + m[2]);
}

export function extractTotal(text) {
  const lines = text.split(/\r?\n/);
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    if (!TOTAL_KEYS.test(lines[i])) continue;
    const near = [lines[i], lines[i + 1] || ''];
    for (const l of near) for (const a of l.match(AMOUNT_RE) || []) found.push(parseAmount(a));
  }
  let vals = found.filter(n => n > 0);
  if (!vals.length) vals = (text.match(AMOUNT_RE) || []).map(parseAmount).filter(n => n > 0);
  return vals.length ? Math.max(...vals) : null;
}

const pad = n => String(n).padStart(2, '0');
function iso(y, m, d) {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function extractDate(text) {
  let m = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (m && iso(+m[1], +m[2], +m[3])) return iso(+m[1], +m[2], +m[3]);
  m = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/);
  if (m && iso(+m[3], +m[2], +m[1])) return iso(+m[3], +m[2], +m[1]);
  m = text.match(/\b(\d{1,2})\s+([A-Za-zא-ת]{3,9})\.?,?\s+(\d{4})\b/);
  if (m && MONTHS[m[2].toLowerCase()]) return iso(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  m = text.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m && MONTHS[m[1].toLowerCase()]) return iso(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  return null;
}

const SKIP = /(חשבונית|קבלה|(?<![a-z])(?:receipt|invoice|tax|date|tel|phone|fax|vat)(?![a-z])|(?<!\p{L})מס(?!\p{L})|תאריך|טל|פקס|(?<!\p{L})ע\.?מ(?!\p{L})|(?<!\p{L})ח\.?פ(?!\p{L})|www\.|@)/iu;
export function extractVendor(text) {
  for (const raw of text.split(/\r?\n/).slice(0, 12)) {
    const l = raw.replace(/["\u05f4]/g, '').replace(/[^\p{L}\p{N}\s&'.\-]/gu, ' ').replace(/\s+/g, ' ').trim();
    const letters = (l.match(/\p{L}/gu) || []).length;
    if (letters < 3 || letters < l.replace(/\s/g, '').length * 0.6 || SKIP.test(l)) continue;
    return l.slice(0, 40);
  }
  return null;
}

export function extractAll(text) {
  return { vendor: extractVendor(text), date: extractDate(text), total: extractTotal(text) };
}
