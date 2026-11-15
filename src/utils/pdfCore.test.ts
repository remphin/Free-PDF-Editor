import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import {
  formatFileSize,
  formatPageNumberLabel,
  isWinAnsiCompatible,
  sanitizeForWinAnsi,
  calculateCompressionSavings,
  reorderItems,
  buildA4ImagePlacement,
  mergePdfsAndNumber,
  parsePageSelection,
  parseRangeGroups,
  splitPdfPages,
  rotatePdfPages,
  organizePdfPages,
  applyTextWatermarkToPdf,
  encryptPdfBytes,
  inspectPdfEncryption,
  unlockPdfBytes,
  repairPdfStructure,
  createCorruptedSamplePdfBytes,
} from './pdfCore';

test('formatFileSize formats bytes, KB, and MB cleanly', () => {
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(1536), '1.5 KB');
  assert.equal(formatFileSize(2 * 1024 * 1024), '2.00 MB');
});

test('formatPageNumberLabel handles all formats in TR and EN', () => {
  assert.equal(formatPageNumberLabel(2, 10, 'number-only', '', 'tr'), '2');
  assert.equal(formatPageNumberLabel(2, 10, 'x-of-y', '', 'en'), '2 / 10');
  assert.equal(formatPageNumberLabel(3, 8, 'page-x', '', 'tr'), 'Sayfa 3');
  assert.equal(formatPageNumberLabel(3, 8, 'page-x', '', 'en'), 'Page 3');
  assert.equal(formatPageNumberLabel(4, 12, 'page-x-of-y', '', 'tr'), 'Sayfa 4 / 12');
  assert.equal(formatPageNumberLabel(4, 12, 'page-x-of-y', '', 'en'), 'Page 4 of 12');
  assert.equal(formatPageNumberLabel(1, 5, 'custom', 'Ek', 'tr'), 'Ek 1 / 5');
});

test('isWinAnsiCompatible and sanitizeForWinAnsi handle Turkish characters safely', () => {
  assert.equal(isWinAnsiCompatible('Sayfa 1 / 5'), true);
  assert.equal(isWinAnsiCompatible('Page 1 of 5'), true);
  assert.equal(isWinAnsiCompatible('Başlık ğüşiöç'), false);
  assert.equal(sanitizeForWinAnsi('Başlık ğüşiöçİ'), 'Baslik gusiocI');
});

test('calculateCompressionSavings computes exact reduction metrics', () => {
  const res = calculateCompressionSavings(1000, 350);
  assert.equal(res.savedBytes, 650);
  assert.equal(res.percentage, 65);
  assert.equal(res.isSmaller, true);

  const noGain = calculateCompressionSavings(500, 500);
  assert.equal(noGain.savedBytes, 0);
  assert.equal(noGain.percentage, 0);
  assert.equal(noGain.isSmaller, false);
});

test('reorderItems moves elements cleanly without mutating original array', () => {
  const original = ['a', 'b', 'c', 'd'];
  const moved = reorderItems(original, 0, 2);
  assert.deepEqual(moved, ['b', 'c', 'a', 'd']);
  assert.deepEqual(original, ['a', 'b', 'c', 'd']);
  assert.deepEqual(reorderItems(original, -1, 2), original);
});

test('buildA4ImagePlacement preserves aspect ratio and centers inside margins', () => {
  const placement = buildA4ImagePlacement(2000, 1000, 595, 842, 20);
  assert.equal(Math.round(placement.width), 555);
  assert.equal(Math.round(placement.height), 278);
  assert.equal(Math.round(placement.x), 20);
  assert.ok(placement.y > 200);
});

test('mergePdfsAndNumber merges multiple real PDFs and applies page numbers', async () => {
  const doc1 = await PDFDocument.create();
  doc1.addPage([595, 842]);
  doc1.addPage([595, 842]);

  const doc2 = await PDFDocument.create();
  doc2.addPage([595, 842]);

  const buf1 = await doc1.save();
  const buf2 = await doc2.save();

  const merged = await mergePdfsAndNumber(
    [buf1, buf2],
    {
      enabled: true,
      position: 'bottom-right',
      format: 'page-x-of-y',
      startNumber: 1,
      fontSize: 11,
      skipFirstPage: false,
    },
    'tr',
  );

  assert.equal(merged.pageCount, 3);
  assert.ok(merged.bytes.byteLength > 500);

  const loadedMerged = await PDFDocument.load(merged.bytes);
  assert.equal(loadedMerged.getPageCount(), 3);
});

test('parsePageSelection and parseRangeGroups parse single pages and ranges accurately', () => {
  assert.deepEqual(parsePageSelection('1, 3-5, 99', 6), [0, 2, 3, 4]);
  assert.deepEqual(parsePageSelection('4-2', 5), [1, 2, 3]);
  assert.deepEqual(parseRangeGroups('1-2, 4, 5-6', 6), [[0, 1], [3], [4, 5]]);
});

test('splitPdfPages splits a multi-page PDF into independent PDF documents', async () => {
  const src = await PDFDocument.create();
  src.addPage([595, 842]);
  src.addPage([595, 842]);
  src.addPage([595, 842]);
  src.addPage([595, 842]);
  const srcBytes = new Uint8Array(await src.save());

  const splitOutputs = await splitPdfPages(srcBytes, [[0], [1, 2], [3]]);
  assert.equal(splitOutputs.length, 3);

  const docA = await PDFDocument.load(splitOutputs[0].bytes);
  const docB = await PDFDocument.load(splitOutputs[1].bytes);
  const docC = await PDFDocument.load(splitOutputs[2].bytes);

  assert.equal(docA.getPageCount(), 1);
  assert.equal(docB.getPageCount(), 2);
  assert.equal(docC.getPageCount(), 1);
});

test('rotatePdfPages updates page rotation angles accurately', async () => {
  const src = await PDFDocument.create();
  src.addPage([595, 842]);
  src.addPage([595, 842]);
  const srcBytes = new Uint8Array(await src.save());

  const rotated = await rotatePdfPages(srcBytes, [90, 180]);
  const loaded = await PDFDocument.load(rotated.bytes);
  assert.equal(loaded.getPage(0).getRotation().angle, 90);
  assert.equal(loaded.getPage(1).getRotation().angle, 180);
});

test('organizePdfPages reorders, duplicates, and removes pages cleanly', async () => {
  const src = await PDFDocument.create();
  src.addPage([400, 400]);
  src.addPage([500, 500]);
  src.addPage([600, 600]);
  const srcBytes = new Uint8Array(await src.save());

  const organized = await organizePdfPages(srcBytes, [2, 0, 2]);
  assert.equal(organized.pageCount, 3);
  const loaded = await PDFDocument.load(organized.bytes);
  assert.equal(Math.round(loaded.getPage(0).getSize().width), 600);
  assert.equal(Math.round(loaded.getPage(1).getSize().width), 400);
  assert.equal(Math.round(loaded.getPage(2).getSize().width), 600);
});

test('applyTextWatermarkToPdf stamps watermark across pages', async () => {
  const src = await PDFDocument.create();
  src.addPage([595, 842]);
  src.addPage([595, 842]);
  const srcBytes = new Uint8Array(await src.save());

  const stamped = await applyTextWatermarkToPdf(srcBytes, {
    text: 'CONFIDENTIAL',
    layout: 'diagonal',
    opacity: 0.3,
    fontSize: 36,
    color: 'crimson',
  });
  assert.equal(stamped.pageCount, 2);
  assert.ok(stamped.bytes.byteLength > srcBytes.byteLength);
});

test('encryptPdfBytes, inspectPdfEncryption, and unlockPdfBytes round-trip password protection', async () => {
  const src = await PDFDocument.create();
  src.addPage([595, 842]);
  const srcBytes = new Uint8Array(await src.save());

  const encrypted = await encryptPdfBytes(srcBytes, {
    userPassword: 'secret-123',
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
  });

  const inspection = await inspectPdfEncryption(encrypted.bytes);
  assert.equal(inspection.isEncrypted, true);

  await assert.rejects(() => unlockPdfBytes(encrypted.bytes, ''), /PASSWORD_REQUIRED/);
  await assert.rejects(() => unlockPdfBytes(encrypted.bytes, 'wrong'), /PASSWORD_INCORRECT/);

  const unlocked = await unlockPdfBytes(encrypted.bytes, 'secret-123');
  assert.equal(unlocked.wasEncrypted, true);
  assert.equal(unlocked.pageCount, 1);

  const postInspection = await inspectPdfEncryption(unlocked.bytes);
  assert.equal(postInspection.isEncrypted, false);
});

test('repairPdfStructure recovers corrupted header and missing %%EOF PDF', async () => {
  const corrupt = await createCorruptedSamplePdfBytes('tr');
  const repaired = await repairPdfStructure(corrupt);
  assert.equal(repaired.diagnostics.headerNormalized, true);
  assert.equal(repaired.diagnostics.eofRestored, true);
  assert.equal(repaired.diagnostics.xrefRebuilt, true);
  assert.equal(repaired.diagnostics.recoveredPages, 3);

  const reloaded = await PDFDocument.load(repaired.bytes);
  assert.equal(reloaded.getPageCount(), 3);
});

