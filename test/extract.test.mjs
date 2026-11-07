import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAll, extractDate, extractTotal, extractVendor, parseAmount } from '../receipt-scanner/extract.js';
import { makeName, folderPath } from '../receipt-scanner/namer.js';

const HE = `סופר יוסי בע"מ
ח.פ 512345678
תאריך: 14/03/2025
חלב 3 שקל 6.90
לחם 12.50
סה"כ לתשלום 1,234.50`;
const EN = `Joe's Coffee House
Tel 555-1234
March 5, 2024
Latte 4.50
Total $12.75`;

test('parseAmount', () => {
  assert.equal(parseAmount('1,234.56'), 1234.56);
  assert.equal(parseAmount('1.234,56'), 1234.56);
  assert.equal(parseAmount('45,90'), 45.9);
});
test('hebrew receipt', () => {
  const r = extractAll(HE);
  assert.equal(r.vendor, 'סופר יוסי בעמ');
  assert.equal(r.date, '2025-03-14');
  assert.equal(r.total, 1234.5);
});
test('english receipt', () => {
  const r = extractAll(EN);
  assert.equal(r.vendor, "Joe's Coffee House");
  assert.equal(r.date, '2024-03-05');
  assert.equal(r.total, 12.75);
});
test('date formats', () => {
  assert.equal(extractDate('2025-01-09'), '2025-01-09');
  assert.equal(extractDate('9.1.25'), '2025-01-09');
  assert.equal(extractDate('12 מרץ 2024'), '2024-03-12');
  assert.equal(extractDate('nothing'), null);
});
test('total falls back to largest amount', () => {
  assert.equal(extractTotal('a 3.00\nb 9.99'), 9.99);
  assert.equal(extractTotal('nothing'), null);
});
test('vendor skips noise', () => {
  assert.equal(extractVendor('\n1234\nחשבונית מס\nCafé Roma\n'), 'Café Roma');
});
test('namer', () => {
  assert.equal(makeName({ date: '2025-03-14', vendor: 'Joe/Cafe: 1', total: 12.5 }), '2025-03-14_JoeCafe-1_12.50.pdf');
  assert.equal(makeName({}, 3, new Date('2025-01-02')), '2025-01-02_Receipt_3.pdf');
  assert.deepEqual(folderPath('2025-03-14'), ['Expenses', '2025', '03-March']);
});
