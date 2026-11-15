import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CopyPlus,
  FileText,
  Loader2,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import type { Language, Translations } from '../i18n/translations';
import { formatFileSize, organizePdfPages, reorderItems } from '../utils/pdfCore';
import {
  createSamplePdfBytes,
  getAllPdfPageThumbnails,
} from '../utils/pdfClient';
import { DropZone } from './DropZone';
import { PdfResultBanner } from './PdfResultBanner';

interface OrganizePageItem {
  uid: string;
  originalIndex: number;
  thumbUrl: string;
}

interface OrganizePdfToolProps {
  lang: Language;
  t: Translations;
}

export function OrganizePdfTool({ lang, t }: OrganizePdfToolProps) {
  const [sourceFile, setSourceFile] = useState<{
    name: string;
    bytes: Uint8Array;
    pageCount: number;
    thumbnails: string[];
  } | null>(null);

  const [pages, setPages] = useState<OrganizePageItem[]>([]);
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    pageCount: number;
    filename: string;
  } | null>(null);

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initPages = (thumbnails: string[]) => {
    setPages(
      thumbnails.map((thumbUrl, idx) => ({
        uid: `org-p-${idx}-${Date.now()}`,
        originalIndex: idx,
        thumbUrl,
      })),
    );
  };

  const loadPdfBytes = async (name: string, bytes: Uint8Array) => {
    setError(null);
    setResult(null);
    setIsLoadingFile(true);
    try {
      const { pageCount, thumbnails } = await getAllPdfPageThumbnails(bytes);
      setSourceFile({ name, bytes, pageCount, thumbnails });
      initPages(thumbnails);
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
        lang === 'tr' ? 'Proje Sunum Dosyası' : 'Project Presentation Deck',
        lang === 'tr' ? 'PDF Labs 4 Sayfalık Örnek' : 'PDF Labs 4-Page Sample',
        lang === 'tr'
          ? [
              'Sayfaları sola/sağa taşıyarak yeniden sıralayabilirsiniz.',
              'İsterseniz bir sayfayı çoğaltabilir veya gereksiz sayfayı silebilirsiniz.',
            ]
          : [
              'Move pages earlier or later to rearrange document order.',
              'Duplicate key pages or remove unwanted pages before saving.',
            ],
        4,
      );
      await loadPdfBytes(
        lang === 'tr' ? 'Sunum_4_Sayfa.pdf' : 'Presentation_4_Pages.pdf',
        bytes,
      );
    } catch {
      setError(t.common.errorGeneric);
      setIsLoadingFile(false);
    }
  };

  const movePage = (index: number, delta: -1 | 1) => {
    setResult(null);
    setPages((prev) => reorderItems(prev, index, index + delta));
  };

  const duplicatePage = (index: number) => {
    setResult(null);
    setPages((prev) => {
      const target = prev[index];
      if (!target) return prev;
      const copy: OrganizePageItem = {
        uid: `org-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        originalIndex: target.originalIndex,
        thumbUrl: target.thumbUrl,
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const deletePage = (index: number) => {
    setError(null);
    if (pages.length <= 1) {
      setError(t.organize.minOnePageError);
      return;
    }
    setResult(null);
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!sourceFile || pages.length === 0) return;
    setError(null);
    setIsProcessing(true);
    try {
      const order = pages.map((p) => p.originalIndex);
      const out = await organizePdfPages(sourceFile.bytes, order);
      const base = sourceFile.name.replace(/\.pdf$/i, '');
      setResult({
        bytes: out.bytes,
        pageCount: out.pageCount,
        filename: `${base}_${lang === 'tr' ? 'duzenlenmis' : 'organized'}.pdf`,
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
        title={t.organize.dropTitle}
        hint={t.organize.dropHint}
        selectLabel={t.organize.selectPdf}
        sampleLabel={t.organize.loadSample}
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
          title={t.organize.resultTitle}
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
              {sourceFile ? sourceFile.name : t.organize.gridTitle}
            </h2>
            {sourceFile && (
              <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                {pages.length} {t.common.pages} · {formatFileSize(sourceFile.bytes.byteLength)}
              </p>
            )}
          </div>

          {sourceFile && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setError(null);
                  initPages(sourceFile.thumbnails);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.organize.resetOrder}</span>
              </button>
              <button
                type="button"
                disabled={isProcessing || pages.length === 0}
                onClick={handleSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg cursor-pointer whitespace-nowrap"
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{isProcessing ? t.common.processing : t.organize.applyButton}</span>
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
            {pages.map((item, idx) => (
              <div
                key={item.uid}
                className="rounded-xl border border-slate-200 bg-slate-50/40 p-2.5 flex flex-col justify-between gap-2"
              >
                <div className="aspect-[3/4] w-full rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                  {item.thumbUrl ? (
                    <img
                      src={item.thumbUrl}
                      alt={`${t.common.page} ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <FileText className="w-7 h-7 text-slate-300" aria-hidden="true" />
                  )}
                </div>

                <div className="flex items-center justify-between text-xs px-0.5 font-mono tabular-nums">
                  <span className="font-semibold text-slate-800">#{idx + 1}</span>
                  <span className="text-slate-500">
                    ({lang === 'tr' ? 'Orj' : 'Orig'} {item.originalIndex + 1})
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => movePage(idx, -1)}
                    aria-label={`${t.common.page} ${idx + 1} - ${t.organize.moveLeft}`}
                    title={t.organize.moveLeft}
                    className="p-1.5 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === pages.length - 1}
                    onClick={() => movePage(idx, 1)}
                    aria-label={`${t.common.page} ${idx + 1} - ${t.organize.moveRight}`}
                    title={t.organize.moveRight}
                    className="p-1.5 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-35 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicatePage(idx)}
                    aria-label={`${t.common.page} ${idx + 1} - ${t.organize.duplicatePage}`}
                    title={t.organize.duplicatePage}
                    className="p-1.5 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <CopyPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePage(idx)}
                    aria-label={`${t.common.page} ${idx + 1} - ${t.organize.deletePage}`}
                    title={t.organize.deletePage}
                    className="p-1.5 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-200 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
