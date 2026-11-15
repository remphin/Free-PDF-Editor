import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { PDFDocument as CantooPDFDocument } from '@cantoo/pdf-lib';
import type { Language } from '../i18n/translations';

export type PageNumberPosition =
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'top-left'
  | 'top-center'
  | 'top-right';

export type PageNumberFormat =
  | 'number-only'
  | 'x-of-y'
  | 'page-x'
  | 'page-x-of-y'
  | 'custom';

export interface PageNumberOptions {
  enabled: boolean;
  position: PageNumberPosition;
  format: PageNumberFormat;
  customPrefix?: string;
  startNumber: number;
  fontSize: number;
  skipFirstPage: boolean;
  margin?: number;
}

export interface UnicodeStampResult {
  pngBytes: Uint8Array;
  widthPt: number;
  heightPt: number;
}

export type UnicodeStampRenderer = (
  text: string,
  fontSizePt: number,
  colorHex: string,
) => Promise<UnicodeStampResult>;

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function formatPageNumberLabel(
  displayedNumber: number,
  totalDisplayedPages: number,
  format: PageNumberFormat,
  customPrefix: string,
  lang: Language,
): string {
  switch (format) {
    case 'number-only':
      return `${displayedNumber}`;
    case 'x-of-y':
      return `${displayedNumber} / ${totalDisplayedPages}`;
    case 'page-x':
      return lang === 'tr' ? `Sayfa ${displayedNumber}` : `Page ${displayedNumber}`;
    case 'page-x-of-y':
      return lang === 'tr'
        ? `Sayfa ${displayedNumber} / ${totalDisplayedPages}`
        : `Page ${displayedNumber} of ${totalDisplayedPages}`;
    case 'custom': {
      const prefix = (customPrefix || '').trim();
      return prefix
        ? `${prefix} ${displayedNumber} / ${totalDisplayedPages}`
        : `${displayedNumber} / ${totalDisplayedPages}`;
    }
  }
}

export function isWinAnsiCompatible(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    // Basic ASCII printable + Latin-1 supplement (excluding Turkish-specific extensions outside Latin-1 like ğ, ş, ı, İ)
    if (code < 0x20 || (code > 0x7e && code < 0xa0) || code > 0xff) {
      return false;
    }
  }
  return true;
}

export function sanitizeForWinAnsi(text: string): string {
  const map: Record<string, string> = {
    ğ: 'g',
    Ğ: 'G',
    ü: 'u',
    Ü: 'U',
    ş: 's',
    Ş: 'S',
    ı: 'i',
    İ: 'I',
    ö: 'o',
    Ö: 'O',
    ç: 'c',
    Ç: 'C',
  };
  return text
    .split('')
    .map((ch) => map[ch] ?? (isWinAnsiCompatible(ch) ? ch : '?'))
    .join('');
}

export function calculateCompressionSavings(
  originalBytes: number,
  compressedBytes: number,
): { savedBytes: number; percentage: number; isSmaller: boolean } {
  if (originalBytes <= 0) {
    return { savedBytes: 0, percentage: 0, isSmaller: false };
  }
  const savedBytes = Math.max(0, originalBytes - compressedBytes);
  const percentage = Math.max(0, Math.round((savedBytes / originalBytes) * 100));
  return {
    savedBytes,
    percentage,
    isSmaller: compressedBytes < originalBytes,
  };
}

export function reorderItems<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length ||
    fromIndex === toIndex
  ) {
    return items;
  }
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function buildA4ImagePlacement(
  imgWidth: number,
  imgHeight: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
): { x: number; y: number; width: number; height: number } {
  const availWidth = Math.max(10, pageWidth - margin * 2);
  const availHeight = Math.max(10, pageHeight - margin * 2);
  const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
  const width = imgWidth * scale;
  const height = imgHeight * scale;
  const x = (pageWidth - width) / 2;
  const y = (pageHeight - height) / 2;
  return { x, y, width, height };
}

export async function addPageNumbersToPdfDocument(
  pdfDoc: PDFDocument,
  options: PageNumberOptions,
  lang: Language,
  unicodeRenderer?: UnicodeStampRenderer,
): Promise<void> {
  if (!options.enabled) return;
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  if (totalPages === 0) return;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = Math.min(24, Math.max(8, options.fontSize || 10));
  const margin = options.margin ?? 28;
  const startNumber = Math.max(1, Math.floor(options.startNumber || 1));
  const totalDisplayed = options.skipFirstPage
    ? Math.max(1, startNumber + totalPages - 2)
    : startNumber + totalPages - 1;

  for (let i = 0; i < totalPages; i += 1) {
    if (options.skipFirstPage && i === 0) continue;

    const page = pages[i];
    const { width, height } = page.getSize();
    const displayedNum = options.skipFirstPage
      ? startNumber + i - 1
      : startNumber + i;

    const label = formatPageNumberLabel(
      displayedNum,
      totalDisplayed,
      options.format,
      options.customPrefix ?? '',
      lang,
    );

    const isTop = options.position.startsWith('top');
    const isLeft = options.position.endsWith('left');
    const isRight = options.position.endsWith('right');

    const yPos = isTop ? height - margin - fontSize * 0.4 : margin;

    if (isWinAnsiCompatible(label)) {
      const textWidth = font.widthOfTextAtSize(label, fontSize);
      let xPos = (width - textWidth) / 2;
      if (isLeft) xPos = margin;
      if (isRight) xPos = width - margin - textWidth;

      page.drawText(label, {
        x: Math.max(8, xPos),
        y: Math.max(8, yPos),
        size: fontSize,
        font,
        color: rgb(0.2, 0.25, 0.33),
      });
    } else if (unicodeRenderer) {
      const stamp = await unicodeRenderer(label, fontSize, '#334155');
      const pngImage = await pdfDoc.embedPng(stamp.pngBytes);
      let xPos = (width - stamp.widthPt) / 2;
      if (isLeft) xPos = margin;
      if (isRight) xPos = width - margin - stamp.widthPt;

      page.drawImage(pngImage, {
        x: Math.max(8, xPos),
        y: Math.max(8, yPos - 2),
        width: stamp.widthPt,
        height: stamp.heightPt,
      });
    } else {
      const safeLabel = sanitizeForWinAnsi(label);
      const textWidth = font.widthOfTextAtSize(safeLabel, fontSize);
      let xPos = (width - textWidth) / 2;
      if (isLeft) xPos = margin;
      if (isRight) xPos = width - margin - textWidth;

      page.drawText(safeLabel, {
        x: Math.max(8, xPos),
        y: Math.max(8, yPos),
        size: fontSize,
        font,
        color: rgb(0.2, 0.25, 0.33),
      });
    }
  }
}

export async function mergePdfsAndNumber(
  pdfBuffers: Uint8Array[],
  options: PageNumberOptions,
  lang: Language,
  unicodeRenderer?: UnicodeStampRenderer,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  if (pdfBuffers.length === 0) {
    throw new Error('At least one PDF buffer is required');
  }

  const mergedPdf = await PDFDocument.create();
  for (const buffer of pdfBuffers) {
    const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  await addPageNumbersToPdfDocument(mergedPdf, options, lang, unicodeRenderer);
  const bytes = await mergedPdf.save({ useObjectStreams: true });
  return { bytes, pageCount: mergedPdf.getPageCount() };
}

export function parsePageSelection(input: string, totalPages: number): number[] {
  if (totalPages <= 0) return [];
  const selected = new Set<number>();
  const tokens = input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(token);
    if (rangeMatch) {
      const a = Math.max(1, Math.min(totalPages, Number(rangeMatch[1])));
      const b = Math.max(1, Math.min(totalPages, Number(rangeMatch[2])));
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let p = start; p <= end; p += 1) {
        selected.add(p - 1);
      }
      continue;
    }

    if (/^\d+$/.test(token)) {
      const p = Number(token);
      if (p >= 1 && p <= totalPages) {
        selected.add(p - 1);
      }
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}

export function parseRangeGroups(input: string, totalPages: number): number[][] {
  if (totalPages <= 0) return [];
  const groups: number[][] = [];
  const tokens = input
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(token);
    if (rangeMatch) {
      const a = Number(rangeMatch[1]);
      const b = Number(rangeMatch[2]);
      if (a >= 1 && b >= 1 && a <= totalPages && b <= totalPages) {
        const start = Math.min(a, b);
        const end = Math.max(a, b);
        const group: number[] = [];
        for (let p = start; p <= end; p += 1) {
          group.push(p - 1);
        }
        if (group.length > 0) groups.push(group);
      }
      continue;
    }

    if (/^\d+$/.test(token)) {
      const p = Number(token);
      if (p >= 1 && p <= totalPages) {
        groups.push([p - 1]);
      }
    }
  }

  return groups;
}

export async function splitPdfPages(
  pdfBytes: Uint8Array,
  pageGroups: number[][],
): Promise<Array<{ bytes: Uint8Array; pageIndices: number[] }>> {
  if (pageGroups.length === 0) {
    throw new Error('At least one page group is required');
  }

  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const outputs: Array<{ bytes: Uint8Array; pageIndices: number[] }> = [];

  for (const group of pageGroups) {
    const validIndices = group.filter((idx) => idx >= 0 && idx < totalPages);
    if (validIndices.length === 0) continue;
    const outDoc = await PDFDocument.create();
    const copiedPages = await outDoc.copyPages(srcDoc, validIndices);
    for (const page of copiedPages) {
      outDoc.addPage(page);
    }
    const bytes = new Uint8Array(await outDoc.save({ useObjectStreams: true }));
    outputs.push({ bytes, pageIndices: validIndices });
  }

  return outputs;
}

export async function rotatePdfPages(
  pdfBytes: Uint8Array,
  deltaAnglesByPage: number[],
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  pages.forEach((page, idx) => {
    const delta = deltaAnglesByPage[idx] ?? 0;
    if (delta !== 0) {
      const current = page.getRotation().angle;
      const next = (((current + delta) % 360) + 360) % 360;
      page.setRotation(degrees(next));
    }
  });
  const bytes = new Uint8Array(await doc.save({ useObjectStreams: true }));
  return { bytes, pageCount: doc.getPageCount() };
}

export async function organizePdfPages(
  pdfBytes: Uint8Array,
  pageOrder: number[],
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  if (pageOrder.length === 0) {
    throw new Error('At least one page is required');
  }
  const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const total = srcDoc.getPageCount();
  const validOrder = pageOrder.filter((idx) => idx >= 0 && idx < total);
  if (validOrder.length === 0) {
    throw new Error('No valid page indices provided');
  }
  const outDoc = await PDFDocument.create();
  const copied = await outDoc.copyPages(srcDoc, validOrder);
  for (const page of copied) {
    outDoc.addPage(page);
  }
  const bytes = new Uint8Array(await outDoc.save({ useObjectStreams: true }));
  return { bytes, pageCount: outDoc.getPageCount() };
}

export type WatermarkLayout = 'diagonal' | 'tiled' | 'footer';
export type WatermarkColor = 'slate' | 'crimson' | 'blue';

export interface WatermarkOptions {
  text: string;
  layout: WatermarkLayout;
  opacity: number;
  fontSize: number;
  color: WatermarkColor;
}

export async function applyTextWatermarkToPdf(
  pdfBytes: Uint8Array,
  options: WatermarkOptions,
  unicodeRenderer?: UnicodeStampRenderer,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const cleanText = options.text.trim();
  if (!cleanText) {
    throw new Error('Watermark text cannot be empty');
  }

  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const opacity = Math.min(0.85, Math.max(0.08, options.opacity));
  const fontSize = Math.min(72, Math.max(12, options.fontSize));

  const colorHex =
    options.color === 'crimson'
      ? '#dc2626'
      : options.color === 'blue'
        ? '#1d4ed8'
        : '#334155';
  const colorRgb =
    options.color === 'crimson'
      ? rgb(0.86, 0.15, 0.15)
      : options.color === 'blue'
        ? rgb(0.11, 0.31, 0.85)
        : rgb(0.2, 0.25, 0.33);

  const canVector = isWinAnsiCompatible(cleanText);
  let stampImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  let stampW = 0;
  let stampH = 0;

  if (!canVector && unicodeRenderer) {
    const stamp = await unicodeRenderer(cleanText, fontSize, colorHex);
    stampImage = await doc.embedPng(stamp.pngBytes);
    stampW = stamp.widthPt;
    stampH = stamp.heightPt;
  }

  const drawStamp = (
    page: (typeof pages)[number],
    x: number,
    y: number,
    angleDeg: number,
    scaleFactor = 1,
  ) => {
    if (canVector) {
      const safe = cleanText;
      const textW = font.widthOfTextAtSize(safe, fontSize * scaleFactor);
      const rad = (angleDeg * Math.PI) / 180;
      const dx = (textW / 2) * Math.cos(rad);
      const dy = (textW / 2) * Math.sin(rad);
      page.drawText(safe, {
        x: x - dx,
        y: y - dy,
        size: fontSize * scaleFactor,
        font,
        color: colorRgb,
        opacity,
        rotate: degrees(angleDeg),
      });
    } else if (stampImage) {
      const w = stampW * scaleFactor;
      const h = stampH * scaleFactor;
      const rad = (angleDeg * Math.PI) / 180;
      const dx = (w / 2) * Math.cos(rad) - (h / 2) * Math.sin(rad);
      const dy = (w / 2) * Math.sin(rad) + (h / 2) * Math.cos(rad);
      page.drawImage(stampImage, {
        x: x - dx,
        y: y - dy,
        width: w,
        height: h,
        opacity,
        rotate: degrees(angleDeg),
      });
    } else {
      const safe = sanitizeForWinAnsi(cleanText);
      const textW = font.widthOfTextAtSize(safe, fontSize * scaleFactor);
      const rad = (angleDeg * Math.PI) / 180;
      const dx = (textW / 2) * Math.cos(rad);
      const dy = (textW / 2) * Math.sin(rad);
      page.drawText(safe, {
        x: x - dx,
        y: y - dy,
        size: fontSize * scaleFactor,
        font,
        color: colorRgb,
        opacity,
        rotate: degrees(angleDeg),
      });
    }
  };

  for (const page of pages) {
    const { width, height } = page.getSize();
    if (options.layout === 'diagonal') {
      drawStamp(page, width / 2, height / 2, 35, 1);
    } else if (options.layout === 'tiled') {
      const cols = 2;
      const rows = 3;
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          const cx = ((c + 0.5) / cols) * width;
          const cy = ((r + 0.5) / rows) * height;
          drawStamp(page, cx, cy, 30, 0.72);
        }
      }
    } else {
      drawStamp(page, width / 2, height - 32, 0, 0.55);
      drawStamp(page, width / 2, 26, 0, 0.55);
    }
  }

  const bytes = new Uint8Array(await doc.save({ useObjectStreams: true }));
  return { bytes, pageCount: doc.getPageCount() };
}

export interface EncryptOptions {
  userPassword: string;
  ownerPassword?: string;
  allowPrinting: boolean;
  allowCopying: boolean;
  allowModifying: boolean;
}

export async function encryptPdfBytes(
  pdfBytes: Uint8Array,
  options: EncryptOptions,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const userPassword = options.userPassword;
  if (!userPassword) {
    throw new Error('User password is required');
  }
  const ownerPassword = options.ownerPassword?.trim() || userPassword;

  const doc = await CantooPDFDocument.load(pdfBytes);
  if (doc.isEncrypted) {
    throw new Error('PDF_ALREADY_ENCRYPTED');
  }

  await doc.encrypt({
    userPassword,
    ownerPassword,
    permissions: {
      printing: options.allowPrinting ? 'highResolution' : false,
      copying: options.allowCopying,
      modifying: options.allowModifying,
      annotating: options.allowModifying,
      fillingForms: options.allowModifying,
      contentAccessibility: true,
      documentAssembly: options.allowModifying,
    },
  });

  const bytes = new Uint8Array(await doc.save({ useObjectStreams: false }));
  return { bytes, pageCount: doc.getPageCount() };
}

export async function inspectPdfEncryption(
  pdfBytes: Uint8Array,
): Promise<{ isEncrypted: boolean; pageCount?: number }> {
  try {
    const doc = await CantooPDFDocument.load(pdfBytes);
    return { isEncrypted: doc.isEncrypted, pageCount: doc.getPageCount() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('encrypted')) {
      return { isEncrypted: true };
    }
    throw err;
  }
}

export async function unlockPdfBytes(
  pdfBytes: Uint8Array,
  password: string,
): Promise<{ bytes: Uint8Array; pageCount: number; wasEncrypted: boolean }> {
  const inspection = await inspectPdfEncryption(pdfBytes);
  if (!inspection.isEncrypted) {
    const doc = await CantooPDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const bytes = new Uint8Array(await doc.save({ useObjectStreams: true }));
    return { bytes, pageCount: doc.getPageCount(), wasEncrypted: false };
  }

  if (!password) {
    throw new Error('PASSWORD_REQUIRED');
  }

  try {
    const doc = await CantooPDFDocument.load(pdfBytes, { password });
    const bytes = new Uint8Array(await doc.save({ useObjectStreams: false }));
    return { bytes, pageCount: doc.getPageCount(), wasEncrypted: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('password')) {
      throw new Error('PASSWORD_INCORRECT');
    }
    throw err;
  }
}

export interface RepairDiagnostics {
  headerNormalized: boolean;
  eofRestored: boolean;
  xrefRebuilt: boolean;
  rasterFallbackUsed: boolean;
  recoveredPages: number;
}

export function normalizeRawPdfEnvelope(rawBytes: Uint8Array): {
  bytes: Uint8Array;
  headerNormalized: boolean;
  eofRestored: boolean;
} {
  let headerNormalized = false;
  let eofRestored = false;

  // Locate %PDF- header within leading bytes
  const headerMarker = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  let startIdx = -1;
  const searchLimit = Math.min(rawBytes.length, 4096);
  for (let i = 0; i <= searchLimit - headerMarker.length; i += 1) {
    if (
      rawBytes[i] === headerMarker[0] &&
      rawBytes[i + 1] === headerMarker[1] &&
      rawBytes[i + 2] === headerMarker[2] &&
      rawBytes[i + 3] === headerMarker[3] &&
      rawBytes[i + 4] === headerMarker[4]
    ) {
      startIdx = i;
      break;
    }
  }

  let working = rawBytes;
  if (startIdx > 0) {
    working = rawBytes.slice(startIdx);
    headerNormalized = true;
  }

  // Check for %%EOF at tail
  const tailSlice = working.slice(Math.max(0, working.length - 128));
  const tailText = new TextDecoder('latin1').decode(tailSlice);
  if (!tailText.includes('%%EOF')) {
    const eofBytes = new TextEncoder().encode('\n%%EOF\n');
    const combined = new Uint8Array(working.length + eofBytes.length);
    combined.set(working, 0);
    combined.set(eofBytes, working.length);
    working = combined;
    eofRestored = true;
  }

  return { bytes: working, headerNormalized, eofRestored };
}

export async function repairPdfStructure(
  rawBytes: Uint8Array,
): Promise<{ bytes: Uint8Array; diagnostics: RepairDiagnostics }> {
  const { bytes: normalizedBytes, headerNormalized, eofRestored } =
    normalizeRawPdfEnvelope(rawBytes);

  const srcDoc = await PDFDocument.load(normalizedBytes, {
    ignoreEncryption: true,
    updateMetadata: false,
    throwOnInvalidObject: false,
  });

  const outDoc = await PDFDocument.create();
  const total = srcDoc.getPageCount();
  let recoveredPages = 0;

  for (let i = 0; i < total; i += 1) {
    try {
      const [copied] = await outDoc.copyPages(srcDoc, [i]);
      outDoc.addPage(copied);
      recoveredPages += 1;
    } catch {
      // Skip irreparably corrupted page node while preserving healthy pages
    }
  }

  if (recoveredPages === 0) {
    throw new Error('NO_RECOVERABLE_PAGES');
  }

  const repairedBytes = new Uint8Array(await outDoc.save({ useObjectStreams: true }));
  return {
    bytes: repairedBytes,
    diagnostics: {
      headerNormalized,
      eofRestored,
      xrefRebuilt: true,
      rasterFallbackUsed: false,
      recoveredPages,
    },
  };
}

export async function createCorruptedSamplePdfBytes(lang: Language): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const body = await doc.embedFont(StandardFonts.Helvetica);

  for (let p = 1; p <= 3; p += 1) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawText(
      lang === 'tr' ? `Kurtarilan Belge - Sayfa ${p}` : `Recovered Document - Page ${p}`,
      { x: 54, y: 760, size: 18, font: bold, color: rgb(0.08, 0.12, 0.2) },
    );
    page.drawText(
      lang === 'tr'
        ? 'Bu ornek dosya bozuk baslik ve eksik %%EOF isaretcisi icerir.'
        : 'This sample PDF simulates leading header junk and a missing %%EOF trailer.',
      { x: 54, y: 724, size: 11, font: body, color: rgb(0.3, 0.35, 0.45) },
    );
  }

  const valid = new Uint8Array(await doc.save({ useObjectStreams: false }));
  // Strip %%EOF at tail and prepend leading corrupt bytes before %PDF-
  const latin = new TextDecoder('latin1').decode(valid);
  const eofPos = latin.lastIndexOf('%%EOF');
  const truncated = eofPos > 0 ? valid.slice(0, eofPos) : valid;
  const junkPrefix = new TextEncoder().encode('CORRUPT_HEADER_BYTES_000\n');
  const corrupt = new Uint8Array(junkPrefix.length + truncated.length);
  corrupt.set(junkPrefix, 0);
  corrupt.set(truncated, junkPrefix.length);
  return corrupt;
}

