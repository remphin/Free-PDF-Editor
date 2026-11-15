import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import type { Language } from '../i18n/translations';
import {
  addPageNumbersToPdfDocument,
  buildA4ImagePlacement,
  isWinAnsiCompatible,
  normalizeRawPdfEnvelope,
  repairPdfStructure,
  sanitizeForWinAnsi,
  type PageNumberOptions,
  type RepairDiagnostics,
  type UnicodeStampResult,
} from './pdfCore';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export async function renderUnicodeStampPng(
  text: string,
  fontSizePt: number,
  colorHex: string,
): Promise<UnicodeStampResult> {
  const scale = 3;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }
  const fontSpec = `500 ${fontSizePt * scale}px "DM Sans", "Plus Jakarta Sans", Arial, sans-serif`;
  ctx.font = fontSpec;
  const metrics = ctx.measureText(text);
  const widthPx = Math.ceil(metrics.width + 12 * scale);
  const heightPx = Math.ceil((fontSizePt + 6) * scale);

  canvas.width = Math.max(10, widthPx);
  canvas.height = Math.max(10, heightPx);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = fontSpec;
  ctx.fillStyle = colorHex;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 6 * scale, canvas.height / 2);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG export failed'))), 'image/png');
  });
  const arrayBuf = await blob.arrayBuffer();
  return {
    pngBytes: new Uint8Array(arrayBuf),
    widthPt: canvas.width / scale,
    heightPt: canvas.height / scale,
  };
}

export async function getPdfInfoAndThumb(
  bytes: Uint8Array,
): Promise<{ pageCount: number; thumbnailUrl: string }> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  let thumbnailUrl = '';
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.35 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      thumbnailUrl = canvas.toDataURL('image/jpeg', 0.78);
    }
  } catch {
    thumbnailUrl = '';
  } finally {
    await loadingTask.destroy();
  }

  return { pageCount, thumbnailUrl };
}

export async function getAllPdfPageThumbnails(
  bytes: Uint8Array,
): Promise<{ pageCount: number; thumbnails: string[] }> {
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  const thumbnails: string[] = [];

  try {
    for (let i = 1; i <= pageCount; i += 1) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.42 });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          thumbnails.push(canvas.toDataURL('image/jpeg', 0.78));
        } else {
          thumbnails.push('');
        }
      } catch {
        thumbnails.push('');
      }
    }
  } finally {
    await loadingTask.destroy();
  }

  return { pageCount, thumbnails };
}

export type CompressionLevel = 'low' | 'balanced' | 'maximum';

export async function compressPdfBytes(
  bytes: Uint8Array,
  level: CompressionLevel,
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  // 1. Structural optimization pass
  const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pageCount = srcDoc.getPageCount();
  const structuralBytes = await srcDoc.save({ useObjectStreams: true });

  // 2. Rasterized JPEG recompression pass via pdf.js
  const profile =
    level === 'low'
      ? { scale: 1.75, quality: 0.85 }
      : level === 'balanced'
        ? { scale: 1.35, quality: 0.68 }
        : { scale: 1.0, quality: 0.45 };

  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;

  try {
    const outDoc = await PDFDocument.create();
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const baseViewport = page.getViewport({ scale: 1.0 });
      const renderViewport = page.getViewport({ scale: profile.scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(renderViewport.width));
      canvas.height = Math.max(1, Math.floor(renderViewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderViewport, canvas }).promise;

      const jpgBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('JPEG encode failed'))),
          'image/jpeg',
          profile.quality,
        );
      });
      const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
      const jpgImage = await outDoc.embedJpg(jpgBytes);

      const newPage = outDoc.addPage([baseViewport.width, baseViewport.height]);
      newPage.drawImage(jpgImage, {
        x: 0,
        y: 0,
        width: baseViewport.width,
        height: baseViewport.height,
      });
    }

    const rasterBytes = await outDoc.save({ useObjectStreams: true });
    // Choose whichever produced the smaller valid PDF
    const bestBytes =
      rasterBytes.byteLength < structuralBytes.byteLength && rasterBytes.byteLength < bytes.byteLength
        ? rasterBytes
        : structuralBytes.byteLength < bytes.byteLength
          ? structuralBytes
          : bytes;

    return { bytes: bestBytes, pageCount };
  } finally {
    await loadingTask.destroy();
  }
}

export interface ImageInput {
  bytes: Uint8Array;
  mimeType: string;
}

async function normalizeImageToPngOrJpg(
  bytes: Uint8Array,
  mimeType: string,
): Promise<{ type: 'png' | 'jpg'; bytes: Uint8Array; width: number; height: number }> {
  const blob = new Blob([bytes.slice()], { type: mimeType || 'image/png' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image decode failed'));
      el.src = url;
    });

    const width = img.naturalWidth || 800;
    const height = img.naturalHeight || 600;

    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return { type: 'jpg', bytes, width, height };
    }
    if (mimeType === 'image/png') {
      return { type: 'png', bytes, width, height };
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const outBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image conversion failed'))), 'image/jpeg', 0.92);
    });
    return {
      type: 'jpg',
      bytes: new Uint8Array(await outBlob.arrayBuffer()),
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function convertImagesToPdfBytes(
  images: ImageInput[],
  options: {
    pageSize: 'a4' | 'letter' | 'fit';
    orientation: 'portrait' | 'landscape';
    numbering?: PageNumberOptions;
    lang?: Language;
  },
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const pdfDoc = await PDFDocument.create();

  for (const imgInput of images) {
    const norm = await normalizeImageToPngOrJpg(imgInput.bytes, imgInput.mimeType);
    const embedded =
      norm.type === 'png' ? await pdfDoc.embedPng(norm.bytes) : await pdfDoc.embedJpg(norm.bytes);

    let pageW: number;
    let pageH: number;
    if (options.pageSize === 'fit') {
      pageW = Math.max(200, Math.min(1600, norm.width * 0.75));
      pageH = Math.max(200, Math.min(2200, norm.height * 0.75));
    } else {
      const baseW = options.pageSize === 'letter' ? 612 : 595.28;
      const baseH = options.pageSize === 'letter' ? 792 : 841.89;
      pageW = options.orientation === 'landscape' ? baseH : baseW;
      pageH = options.orientation === 'landscape' ? baseW : baseH;
    }

    const page = pdfDoc.addPage([pageW, pageH]);
    const margin = options.pageSize === 'fit' ? 0 : 28;
    const rect = buildA4ImagePlacement(norm.width, norm.height, pageW, pageH, margin);
    page.drawImage(embedded, rect);
  }

  if (options.numbering?.enabled && options.lang) {
    await addPageNumbersToPdfDocument(pdfDoc, options.numbering, options.lang, renderUnicodeStampPng);
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return { bytes, pageCount: pdfDoc.getPageCount() };
}

export async function convertHtmlToPdfBytes(
  htmlContent: string,
  options: {
    pageSize?: 'a4' | 'letter';
    orientation?: 'portrait' | 'landscape';
    numbering?: PageNumberOptions;
    lang?: Language;
  } = {},
): Promise<{ bytes: Uint8Array; pageCount: number }> {
  const pageSize = options.pageSize ?? 'a4';
  const orientation = options.orientation ?? 'portrait';

  const pageWidthMm = pageSize === 'letter' ? 215.9 : 210;
  const pageHeightMm = pageSize === 'letter' ? 279.4 : 297;
  const finalW = orientation === 'landscape' ? pageHeightMm : pageWidthMm;
  const finalH = orientation === 'landscape' ? pageWidthMm : pageHeightMm;

  // Split manually on explicit page breaks first
  const segments = htmlContent
    .split(/<hr[^>]*class=["'][^"']*doc-page-break[^"']*["'][^>]*>/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const activeSegments = segments.length > 0 ? segments : ['<p></p>'];
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: pageSize,
  });

  const renderWidthPx = orientation === 'landscape' ? 1040 : 760;
  let isFirstPdfPage = true;

  for (const segmentHtml of activeSegments) {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-99999px';
    container.style.top = '0';
    container.style.width = `${renderWidthPx}px`;
    container.style.background = '#ffffff';
    container.style.color = '#0f172a';
    container.style.padding = '36px 44px';
    container.style.fontFamily = '"DM Sans", Arial, sans-serif';
    container.style.fontSize = '14px';
    container.style.lineHeight = '1.6';
    container.innerHTML = `
      <style>
        h1 { font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a; }
        h2 { font-size: 19px; font-weight: 600; margin: 16px 0 8px 0; color: #1e293b; }
        h3 { font-size: 16px; font-weight: 600; margin: 12px 0 6px 0; color: #334155; }
        p { margin: 0 0 10px 0; }
        ul, ol { margin: 0 0 10px 0; padding-left: 22px; }
        li { margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 12px 0; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 12px; }
        th { background: #f1f5f9; font-weight: 600; }
        img { max-width: 100%; height: auto; }
      </style>
      ${segmentHtml}
    `;
    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });

      const marginMm = 10;
      const contentWidthMm = finalW - marginMm * 2;
      const contentHeightMm = finalH - marginMm * 2;

      const pxPerMm = canvas.width / contentWidthMm;
      const sliceHeightPx = Math.floor(contentHeightMm * pxPerMm);

      let yOffsetPx = 0;
      while (yOffsetPx < canvas.height) {
        const currentSlicePx = Math.min(sliceHeightPx, canvas.height - yOffsetPx);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = currentSlicePx;
        const sliceCtx = sliceCanvas.getContext('2d');
        if (sliceCtx) {
          sliceCtx.fillStyle = '#ffffff';
          sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          sliceCtx.drawImage(
            canvas,
            0,
            yOffsetPx,
            canvas.width,
            currentSlicePx,
            0,
            0,
            canvas.width,
            currentSlicePx,
          );
          const sliceImgData = sliceCanvas.toDataURL('image/jpeg', 0.92);
          const sliceHeightMm = currentSlicePx / pxPerMm;

          if (!isFirstPdfPage) {
            doc.addPage(pageSize, orientation);
          }
          isFirstPdfPage = false;
          doc.addImage(sliceImgData, 'JPEG', marginMm, marginMm, contentWidthMm, sliceHeightMm);
        }
        yOffsetPx += currentSlicePx;
      }
    } finally {
      document.body.removeChild(container);
    }
  }

  let outBytes = new Uint8Array(doc.output('arraybuffer'));
  let pageCount = doc.getNumberOfPages();

  if (options.numbering?.enabled && options.lang) {
    const pdfDoc = await PDFDocument.load(outBytes);
    await addPageNumbersToPdfDocument(pdfDoc, options.numbering, options.lang, renderUnicodeStampPng);
    outBytes = new Uint8Array(await pdfDoc.save({ useObjectStreams: true }));
    pageCount = pdfDoc.getPageCount();
  }

  return { bytes: outBytes, pageCount };
}

export async function createSamplePdfBytes(
  title: string,
  subtitle: string,
  bodyLines: string[],
  pageCount = 2,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);

  for (let p = 0; p < pageCount; p += 1) {
    const page = doc.addPage([595.28, 841.89]);
    const { height } = page.getSize();

    const safeTitle = isWinAnsiCompatible(title) ? title : sanitizeForWinAnsi(title);
    const safeSub = isWinAnsiCompatible(subtitle) ? subtitle : sanitizeForWinAnsi(subtitle);

    page.drawText(`${safeTitle} (${p + 1}/${pageCount})`, {
      x: 52,
      y: height - 72,
      size: 20,
      font: boldFont,
      color: rgb(0.06, 0.09, 0.16),
    });

    page.drawText(safeSub, {
      x: 52,
      y: height - 100,
      size: 12,
      font: bodyFont,
      color: rgb(0.3, 0.35, 0.44),
    });

    let cursorY = height - 148;
    for (const line of bodyLines) {
      const safeLine = isWinAnsiCompatible(line) ? line : sanitizeForWinAnsi(line);
      page.drawText(safeLine, {
        x: 52,
        y: cursorY,
        size: 11,
        font: bodyFont,
        color: rgb(0.15, 0.2, 0.28),
      });
      cursorY -= 22;
    }
  }

  return doc.save();
}

export async function createHeavySamplePdfBytes(lang: Language): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  // Create a large uncompressed PNG image on canvas so compression yields 70-85% reduction
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 1200, 1600);
    grad.addColorStop(0, '#eff6ff');
    grad.addColorStop(0.5, '#dbeafe');
    grad.addColorStop(1, '#f8fafc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 1600);

    // Draw high-detail architectural grid & chart bars
    ctx.strokeStyle = '#93c5fd';
    ctx.lineWidth = 2;
    for (let x = 80; x < 1120; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 120);
      ctx.lineTo(x, 1480);
      ctx.stroke();
    }
    for (let y = 120; y < 1480; y += 60) {
      ctx.beginPath();
      ctx.moveTo(80, y);
      ctx.lineTo(1120, y);
      ctx.stroke();
    }

    ctx.fillStyle = '#1d4ed8';
    for (let i = 0; i < 8; i += 1) {
      const barH = 200 + ((i * 137) % 600);
      ctx.fillRect(140 + i * 120, 1300 - barH, 76, barH);
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText(lang === 'tr' ? 'Yillik Performans Raporu' : 'Annual Performance Report', 120, 220);
  }

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Sample PNG failed'))), 'image/png');
  });
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
  const pngImg = await doc.embedPng(pngBytes);

  for (let p = 0; p < 3; p += 1) {
    const page = doc.addPage([595.28, 841.89]);
    page.drawImage(pngImg, { x: 28, y: 28, width: 539.28, height: 785.89 });
    page.drawText(`PDF Labs Sample #${p + 1}`, {
      x: 48,
      y: 780,
      size: 14,
      font: boldFont,
      color: rgb(0.1, 0.15, 0.25),
    });
  }

  return doc.save({ useObjectStreams: false });
}

export async function createSampleImageBytes(lang: Language): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 960, 640);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, 960, 120);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(lang === 'tr' ? 'Mimari Proje Özeti — 2026' : 'Architectural Project Brief — 2026', 48, 72);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(48, 168, 400, 260);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(80, 220, 110, 170);
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(210, 190, 110, 200);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(340, 260, 80, 130);

    ctx.fillStyle = '#334155';
    ctx.font = '22px sans-serif';
    ctx.fillText(
      lang === 'tr' ? 'Görselden PDF\'e yüksek çözünürlüklü çıktı' : 'High-resolution Image to PDF export',
      480,
      230,
    );
    ctx.fillStyle = '#64748b';
    ctx.font = '18px sans-serif';
    ctx.fillText('PNG / JPG / WebP / SVG', 480, 275);
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Sample image failed'))), 'image/png');
  });
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    mimeType: 'image/png',
  };
}

export interface RenderedPageImage {
  pageNumber: number;
  bytes: Uint8Array;
  dataUrl: string;
  width: number;
  height: number;
}

export async function renderPdfPagesToImages(
  pdfBytes: Uint8Array,
  format: 'png' | 'jpg',
  scale: 1 | 2 | 3,
): Promise<RenderedPageImage[]> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice() });
  const pdf = await loadingTask.promise;
  const results: RenderedPageImage[] = [];

  try {
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const quality = format === 'png' ? undefined : 0.9;

    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Page image export failed'))),
          mime,
          quality,
        );
      });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const dataUrl = canvas.toDataURL(mime, quality);
      results.push({
        pageNumber: i,
        bytes,
        dataUrl,
        width: canvas.width,
        height: canvas.height,
      });
    }
  } finally {
    await loadingTask.destroy();
  }

  return results;
}

export async function repairPdfBytesWithFallback(
  rawBytes: Uint8Array,
): Promise<{ bytes: Uint8Array; diagnostics: RepairDiagnostics }> {
  try {
    return await repairPdfStructure(rawBytes);
  } catch {
    // Fallback to tolerant pdf.js recovery and rebuild clean pages
    const { bytes: normalizedBytes, headerNormalized, eofRestored } =
      normalizeRawPdfEnvelope(rawBytes);

    const loadingTask = pdfjsLib.getDocument({ data: normalizedBytes.slice() });
    const pdf = await loadingTask.promise;
    try {
      const outDoc = await PDFDocument.create();
      let recoveredPages = 0;

      for (let i = 1; i <= pdf.numPages; i += 1) {
        try {
          const page = await pdf.getPage(i);
          const baseViewport = page.getViewport({ scale: 1.0 });
          const renderViewport = page.getViewport({ scale: 1.75 });
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.floor(renderViewport.width));
          canvas.height = Math.max(1, Math.floor(renderViewport.height));
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: renderViewport, canvas }).promise;

          const jpgBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error('Recovery render failed'))),
              'image/jpeg',
              0.88,
            );
          });
          const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
          const jpgImg = await outDoc.embedJpg(jpgBytes);
          const newPage = outDoc.addPage([baseViewport.width, baseViewport.height]);
          newPage.drawImage(jpgImg, {
            x: 0,
            y: 0,
            width: baseViewport.width,
            height: baseViewport.height,
          });
          recoveredPages += 1;
        } catch {
          // Skip unreadable page
        }
      }

      if (recoveredPages === 0) {
        throw new Error('NO_RECOVERABLE_PAGES');
      }

      const bytes = new Uint8Array(await outDoc.save({ useObjectStreams: true }));
      return {
        bytes,
        diagnostics: {
          headerNormalized,
          eofRestored,
          xrefRebuilt: true,
          rasterFallbackUsed: true,
          recoveredPages,
        },
      };
    } finally {
      await loadingTask.destroy();
    }
  }
}

export function triggerBytesDownload(bytes: Uint8Array, filename: string, mimeType = 'application/pdf'): void {
  const blob = new Blob([bytes.slice()], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
