import { useState } from 'react';
import {
  FileText,
  Loader2,
  RotateCcw,
  RotateCw,
  Save,
} from 'lucide-react';
import type { Language, Translations } from '../i18n/translations';
import { formatFileSize, rotatePdfPages } from '../utils/pdfCore';
import {
  createSamplePdfBytes,
  getAllPdfPageThumbnails,
} from '../utils/pdfClient';
import { DropZone } from './DropZone';
import { PdfResultBanner } from './PdfResultBanner';

interface RotatePdfToolProps {
  lang: Language;
  t: Translations;
}

export function RotatePdfTool({ lang, t }: RotatePdfToolProps) {
  const [sourceFile, setSourceFile] = useState<{
    name: string;
    bytes: Uint8Array;
    pageCount: number;
    thumbnails: string[];
  } | null>(null);

  const [rotations, setRotations] = useState<number[]>([]);
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    pageCount: number;
    filename: string;
  } | null>(null);

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPdfBytes = async (name: string, bytes: Uint8Array) => {
    setError(null);
    setResult(null);
    setIsLoadingFile(true);
    try {
      const { pageCount, thumbnails } = await getAllPdfPageThumbnails(bytes);
      setSourceFile({ name, bytes, pageCount, thumbnails });
      setRotations(Array.from({ length: pageCount }, () => 0));
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError(t.common.errorInvalidFile);
      return;
    }
    const buf = await file.arrayBuffer();
    await loadPdfBytes(file.name, new Uint8Array(buf));
  };

  const handleLoadSample = async () => {
    setError(null);
    setIsLoadingFile(true);
    try {
      const bytes = await createSamplePdfBytes(
        lang === 'tr' ? 'Mimari Kat Plani' : 'Architectural Floor Plan',
        lang === 'tr' ? 'PDF Döndür Örnek Belgesi' : 'Rotate PDF Sample Document',
        lang === 'tr'
          ? [
              'Sayfaları tek tek 90° sola/sağa döndürebilir veya tüm belgeye toplu açı verebilirsiniz.',
              'Önizleme küçük resimleri seçtiğiniz açıyı anlık gösterir.',
            ]
          : [
              'Rotate any page 90 degrees left/right or apply a global rotation to every page.',
              'Thumbnail previews update instantaneously before exporting.',
            ],
        4,
      );
      await loadPdfBytes(
        lang === 'tr' ? 'Kat_Plani_4_Sayfa.pdf' : 'Floor_Plan_4_Pages.pdf',
        bytes,
      );
    } catch {
      setError(t.common.errorGeneric);
      setIsLoadingFile(false);
    }
  };

  const rotatePage = (idx: number, delta: number) => {
    setResult(null);
    setRotations((prev) =>
      prev.map((angle, i) => (i === idx ? (((angle + delta) % 360) + 360) % 360 : angle)),
    );
  };

  const rotateAll = (delta: number) => {
    setResult(null);
    setRotations((prev) => prev.map((angle) => (((angle + delta) % 360) + 360) % 360));
  };

  const handleApply = async () => {
    if (!sourceFile) return;
    setError(null);
    setIsProcessing(true);
    try {
      const out = await rotatePdfPages(sourceFile.bytes, rotations);
      const base = sourceFile.name.replace(/\.pdf$/i, '');
      setResult({
        bytes: out.bytes,
        pageCount: out.pageCount,
        filename: `${base}_${lang === 'tr' ? 'dondurulmus' : 'rotated'}.pdf`,
      });
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <DropZone
        accept="application/pdf,.pdf"
        multiple={false}
        title={t.rotate.dropTitle}
        hint={t.rotate.dropHint}
        selectLabel={t.rotate.selectPdf}
        sampleLabel={t.rotate.loadSample}
        onFilesSelected={handleFilesSelected}
        onLoadSample={handleLoadSample}
        sampleLoading={isLoadingFile}
      />

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && (
        <PdfResultBanner
          title={t.rotate.resultTitle}
          filename={result.filename}
          bytes={result.bytes}
          pageCount={result.pageCount}
          t={t}
        />
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              {sourceFile ? sourceFile.name : t.rotate.gridTitle}
            </h2>
            {sourceFile && (
              <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                {sourceFile.pageCount} {t.common.pages} · {formatFileSize(sourceFile.bytes.byteLength)}
              </p>
            )}
          </div>

          {sourceFile && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => rotateAll(-90)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.rotate.rotateAllLeft}</span>
              </button>
              <button
                type="button"
                onClick={() => rotateAll(90)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.rotate.rotateAllRight}</span>
              </button>
              <button
                type="button"
                onClick={() => rotateAll(180)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
              >
                {t.rotate.rotateAll180}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setRotations(Array.from({ length: sourceFile.pageCount }, () => 0));
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap"
              >
                {t.rotate.resetAll}
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleApply}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg cursor-pointer whitespace-nowrap"
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{isProcessing ? t.common.processing : t.rotate.applyButton}</span>
              </button>
            </div>
          )}
        </div>

        {!sourceFile ? (
          <div className="py-12 text-center">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2.5" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">{t.common.emptyQueueTitle}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {t.common.emptyQueueDesc}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sourceFile.thumbnails.map((thumb, idx) => {
              const angle = rotations[idx] ?? 0;
              const pageNum = idx + 1;
              return (
                <div
                  key={pageNum}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 p-2.5 flex flex-col justify-between gap-2.5"
                >
                  <div className="aspect-[3/4] w-full rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center p-1">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={`${t.common.page} ${pageNum}`}
                        referrerPolicy="no-referrer"
                        style={{ transform: `rotate(${angle}deg)` }}
                        className="w-full h-full object-contain transition-transform duration-200"
                      />
                    ) : (
                      <FileText className="w-7 h-7 text-slate-300" aria-hidden="true" />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1 text-xs">
                    <span className="font-mono tabular-nums font-medium text-slate-800">
                      {lang === 'tr' ? `S.${pageNum}` : `P.${pageNum}`}
                    </span>
                    <span className="font-mono tabular-nums text-slate-500">
                      {angle}°
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => rotatePage(idx, -90)}
                      aria-label={`${t.common.page} ${pageNum} - ${t.rotate.rotateLeft}`}
                      className="inline-flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>-90°</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => rotatePage(idx, 90)}
                      aria-label={`${t.common.page} ${pageNum} - ${t.rotate.rotateRight}`}
                      className="inline-flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>+90°</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
