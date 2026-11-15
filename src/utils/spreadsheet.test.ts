import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCellValue,
  parseWorkbookBytes,
  buildSheetHtmlTable,
  createSampleWorkbookBytes,
} from './spreadsheet';

test('normalizeCellValue formats primitives consistently', () => {
  assert.equal(normalizeCellValue(null), '');
  assert.equal(normalizeCellValue(undefined), '');
  assert.equal(normalizeCellValue(42), '42');
  assert.equal(normalizeCellValue(3.1415926), '3.1416');
  assert.equal(normalizeCellValue('  Merhaba  '), 'Merhaba');
});

test('createSampleWorkbookBytes and parseWorkbookBytes round-trip Turkish Excel data', () => {
  const bytes = createSampleWorkbookBytes('tr');
  const sheets = parseWorkbookBytes(bytes);

  assert.equal(sheets.length, 1);
  assert.equal(sheets[0].name, 'Stok_Raporu');
  assert.equal(sheets[0].headers[0], 'Ürün Kodu');
  assert.equal(sheets[0].totalRows, 5);
  assert.equal(sheets[0].rows[0][0], 'PRD-101');
});

test('buildSheetHtmlTable escapes HTML and includes all rows', () => {
  const html = buildSheetHtmlTable({
    name: 'Report <Q1>',
    headers: ['Name', 'Value'],
    rows: [
      ['Alpha & Beta', '100'],
      ['Gamma', '200'],
    ],
    totalRows: 2,
  });

  assert.ok(html.includes('Report &lt;Q1&gt;'));
  assert.ok(html.includes('Alpha &amp; Beta'));
  assert.ok(html.includes('<table'));
});
