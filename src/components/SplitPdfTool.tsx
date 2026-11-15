import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Scissors,
} from 'lucide-react';
import type { Language, Translations } from '../i18n/translations';
import {
  formatFileSize,
  parseRangeGroups,
  splitPdfPages,
} from '../utils/pdfCore';
import {
  createSamplePdfBytes,
  getAllPdfPageThumbnails,
  triggerBytesDownload,
} from '../utils/pdfClient';
import { DropZone } from './DropZone';

type SplitMode = 'all-individual' | 'selected-individual' | 'extract-single' | 'custom-ranges';

interface SplitOutputItem {
  id: string;
  filename: string;
  bytes: Uint8Array;
  pageNumbers: number[];
}

interface SplitPdfToolProps {
  lang: Language;
  t: Translations;
}

export function SplitPdfTool({ lang, t }: SplitPdfToolProps) {
  const [sourceFile, setSourceFile] = useState<{
    name: string;
    bytes: Uint8Array;
    pageCount: number;
    thumbnails: string[];
  } | null>(null);

  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [mode, setMode] = useState<SplitMode>('all-individual');
  const [rangeInput, setRangeInput] = useState('1-2, 3-4');
  const [results, setResults] = useState<SplitOutputItem[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePreviewItem = results.find((r) => r.id === previewId) ?? null;

  const previewUrl = useMemo(() => {
    if (!activePreviewItem) return '';
    const blob = new Blob([activePreviewItem.bytes.slice()], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }, [activePreviewItem]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loadPdfBytes = async (name: string, bytes: Uint8Array) => {
    setError(null);
    setIsLoadingFile(true);
    try {
      const { pageCount, thumbnails } = await getAllPdfPageThumbnails(bytes);
      setSourceFile({ name, bytes, pageCount, thumbnails });
      setSelectedPages(Array.from({ length: pageCount }, (_, i) => i));
      setRangeInput(pageCount >= 4 ? '1-2, 3-4' : pageCount > 1 ? `1, 2-${pageCount}` : '1');
      setResults([]);
      setPreviewId(null);
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
    const buffer = await file.arrayBuffer();
    await loadPdfBytes(file.name, new Uint8Array(buffer));
  };

  const handleLoadSample = async () => {
    setError(null);
    setIsLoadingFile(true);
    try {
      const sampleBytes = await createSamplePdfBytes(
        lang === 'tr' ? 'Kurumsal Faaliyet Raporu' : 'Annual Operations Report',
        lang === 'tr' ? 'PDF Labs 4 Sayfalı Örnek PDF' : 'PDF Labs 4-Page Sample PDF',
        lang === 'tr'
          ? [
              'Bu çok sayfalı belge PDF Ayır aracını test etmek için oluşturulmuştur.',
              'İster her sayfayı bağımsız PDF yapabilir, ister seçtiğiniz sayfaları çıkarabilirsiniz.',
            ]
          : [
              'This multi-page document was created to test the Split PDF tool.',
              'Extract every page as its own independent PDF or split custom page ranges.',
            ],
        4,
      );
      await loadPdfBytes(
        lang === 'tr' ? 'Faaliyet_Raporu_4_Sayfa.pdf' : 'Operations_Report_4_Pages.pdf',
        sampleBytes,
      );
    } catch {
      setError(t.common.errorGeneric);
      setIsLoadingFile(false);
    }
  };

  const togglePageSelection = (pageIdx: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageIdx)
        ? prev.filter((p) => p !== pageIdx)
        : [...prev, pageIdx].sort((a, b) => a - b),
    );
  };

  const handleSplit = async () => {
    if (!sourceFile) return;
    setError(null);
    setPreviewId(null);

    let pageGroups: number[][] = [];
    if (mode === 'all-individual') {
      pageGroups = Array.from({ length: sourceFile.pageCount }, (_, i) => [i]);
    } else if (mode === 'selected-individual') {
      if (selectedPages.length === 0) {
        setError(t.split.noSelectionError);
        return;
      }
      pageGroups = selectedPages.map((p) => [p]);
    } else if (mode === 'extract-single') {
      if (selectedPages.length === 0) {
        setError(t.split.noSelectionError);
        return;
      }
      pageGroups = [selectedPages];
    } else {
      pageGroups = parseRangeGroups(rangeInput, sourceFile.pageCount);
      if (pageGroups.length === 0) {
        setError(t.split.invalidRangeError);
        return;
      }
    }

    setIsProcessing(true);
    try {
      const baseName = sourceFile.name.replace(/\.pdf$/i, '');
      const outputs = await splitPdfPages(sourceFile.bytes, pageGroups);
      const formatted: SplitOutputItem[] = outputs.map((out, idx) => {
        const humanPages = out.pageIndices.map((p) => p + 1);
        const pageSuffix =
          humanPages.length === 1
            ? `${lang === 'tr' ? 'sayfa' : 'page'}_${humanPages[0]}`
            : `${lang === 'tr' ? 'sayfalar' : 'pages'}_${humanPages[0]}-${humanPages[humanPages.length - 1]}`;
        return {
          id: `split-out-${idx}-${Date.now()}`,
          filename: `${baseName}_${pageSuffix}.pdf`,
          bytes: out.bytes,
          pageNumbers: humanPages,
        };
      });
      setResults(formatted);
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
        title={t.split.dropTitle}
        hint={t.split.dropHint}
        selectLabel={t.split.selectPdf}
        sampleLabel={t.split.loadSample}
        onFilesSelected={handleFilesSelected}
        onLoadSample={handleLoadSample}
        sampleLoading={isLoadingFile}
      />

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Results List */}
      {results.length > 0 && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" aria-hidden="true" />
              <h3 className="font-display text-sm font-semibold text-slate-900">
                {t.split.resultsTitle} ({results.length})
              </h3>
            </div>
            {results.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  results.forEach((item, idx) => {
                    setTimeout(() => {
                      triggerBytesDownload(item.bytes, item.filename);
                    }, idx * 180);
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.split.downloadAll}</span>
              </button>
            )}
          </div>

          <ul className="divide-y divide-emerald-200/70 bg-white rounded-lg border border-emerald-200">
            {results.map((item) => {
              const isPreviewOpen = previewId === item.id;
              return (
                <li key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.filename}</p>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      {lang === 'tr' ? 'Sayfa' : 'Pages'}: {item.pageNumbers.join(', ')} ·{' '}
                      {formatFileSize(item.bytes.byteLength)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewId(isPreviewOpen ? null : item.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      {isPreviewOpen ? (
                        <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>{isPreviewOpen ? t.common.hidePreview : t.common.previewPdf}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerBytesDownload(item.bytes, item.filename)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.common.downloadPdf}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {activePreviewItem && previewUrl && (
            <div className="rounded-lg overflow-hidden border border-slate-200 bg-white">
              <iframe
                title={activePreviewItem.filename}
                src={previewUrl}
                className="w-full h-[460px] border-0"
              />
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Visual Page Grid */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                {sourceFile ? sourceFile.name : t.split.pagesGridTitle}
              </h2>
              {sourceFile && (
                <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                  {sourceFile.pageCount} {t.common.pages} · {formatFileSize(sourceFile.bytes.byteLength)} ·{' '}
                  {selectedPages.length} {t.split.selectedCount}
                </p>
              )}
            </div>

            {sourceFile && (
              <div className="flex items-center gap-3 text-xs font-medium">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedPages(Array.from({ length: sourceFile.pageCount }, (_, i) => i))
                  }
                  className="text-blue-700 hover:text-blue-800 cursor-pointer whitespace-nowrap"
                >
                  {t.split.selectAll}
                </button>
                <span aria-hidden="true" className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedPages([])}
                  className="text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap"
                >
                  {t.split.deselectAll}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 pt-4">
              {sourceFile.thumbnails.map((thumbUrl, idx) => {
                const isSelected = selectedPages.includes(idx);
                const pageNum = idx + 1;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => togglePageSelection(idx)}
                    aria-pressed={isSelected}
                    aria-label={`${t.common.page} ${pageNum}`}
                    className={`group relative rounded-lg border p-2 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-blue-700 bg-blue-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="aspect-[3/4] w-full rounded border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={`${t.common.page} ${pageNum}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <FileText className="w-6 h-6 text-slate-300" aria-hidden="true" />
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-1 px-0.5">
                      <span className="text-xs font-mono tabular-nums font-medium text-slate-800">
                        {lang === 'tr' ? `Sayfa ${pageNum}` : `Page ${pageNum}`}
                      </span>
                      <span
                        aria-hidden="true"
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          isSelected
                            ? 'bg-blue-700 border-blue-700 text-white'
                            : 'bg-white border-slate-300 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Split Mode & Action */}
        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900 pb-3 border-b border-slate-100">
            {t.split.settingsTitle}
          </h2>

          <div className="space-y-2.5">
            <span className="block text-xs font-medium text-slate-700">
              {t.split.modeLabel}
            </span>
            {(
              [
                'all-individual',
                'selected-individual',
                'extract-single',
                'custom-ranges',
              ] as SplitMode[]
            ).map((key) => {
              const active = mode === key;
              const info = t.split.modes[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  aria-pressed={active}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'border-blue-700 bg-blue-50/70'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{info.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{info.desc}</p>
                </button>
              );
            })}
          </div>

          {mode === 'custom-ranges' && (
            <div>
              <label
                htmlFor="split-range-input"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t.split.rangeInputLabel}
              </label>
              <input
                id="split-range-input"
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder={t.split.rangeInputPlaceholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <p className="text-xs text-slate-500 mt-1">{t.split.rangeInputHint}</p>
            </div>
          )}

          <button
            type="button"
            disabled={!sourceFile || isProcessing}
            onClick={handleSplit}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Scissors className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{isProcessing ? t.common.processing : t.split.splitButton}</span>
          </button>
        </aside>
      </div>
    </div>
  );
}
