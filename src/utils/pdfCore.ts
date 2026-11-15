import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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

