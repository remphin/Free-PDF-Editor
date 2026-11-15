import { useState } from 'react';
import { ArrowDown, ArrowUp, FileText, Layers, Loader2, Trash2 } from 'lucide-react';
import type { Language, Translations } from '../i18n/translations';
import {
  formatFileSize,
  mergePdfsAndNumber,
  reorderItems,
  type PageNumberFormat,
  type PageNumberOptions,
  type PageNumberPosition,
} from '../utils/pdfCore';
import {
  createSamplePdfBytes,
  getPdfInfoAndThumb,
  renderUnicodeStampPng,
} from '../utils/pdfClient';
import { DropZone } from './DropZone';
import { PdfResultBanner } from './PdfResultBanner';

interface PdfQueueItem {
  id: string;
  name: string;
  bytes: Uint8Array;
  pageCount: number;
  thumbnailUrl: string;
}

interface MergePdfToolProps {
  lang: Language;
  t: Translations;
}

const POSITIONS: PageNumberPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

export function MergePdfTool({ lang, t }: MergePdfToolProps) {
  const [queue, setQueue] = useState<PdfQueueItem[]>([]);
  const [numbering, setNumbering] = useState<PageNumberOptions>({
    enabled: true,
    position: 'bottom-right',
    format: 'page-x-of-y',
    customPrefix: '',
    startNumber: 1,
    fontSize: 10,
    skipFirstPage: false,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    bytes: Uint8Array;
    pageCount: number;
    filename: string;
  } | null>(null);

  const handleAddFiles = async (files: File[]) => {
    setError(null);
    const nextItems: PdfQueueItem[] = [];
    for (const file of files) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError(t.common.errorInvalidFile);
        continue;
      }
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const info = await getPdfInfoAndThumb(bytes);
        nextItems.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          bytes,
          pageCount: info.pageCount,
          thumbnailUrl: info.thumbnailUrl,
        });
      } catch {
        setError(t.common.errorGeneric);
      }
    }
    if (nextItems.length > 0) {
      setQueue((prev) => [...prev, ...nextItems]);
      setResult(null);
    }
  };

  const handleLoadSamples = async () => {
    setError(null);
    setIsLoadingSample(true);
    try {
      const sample1Bytes = await createSamplePdfBytes(
        lang === 'tr' ? 'Sozlesme Metni - Bolum 1' : 'Master Agreement - Part 1',
        lang === 'tr' ? 'PDF Labs Ornek Belge A' : 'PDF Labs Sample Document A',
        lang === 'tr'
          ? [
              'Bu ornek PDF dosyasi birlestirme ve numaralandirma testi icin olusturulmustur.',
              '1. Taraflar arasindaki genel hukumler bu bolumde yer alir.',
              '2. Teslimat ve odeme takvimi ek tabloda belirtilmistir.',
            ]
          : [
              'This sample PDF was generated for testing merge and page numbering.',
              '1. General terms between the parties are outlined in this section.',
              '2. Delivery schedule and milestones appear in the appendix.',
            ],
        2,
      );

      const sample2Bytes = await createSamplePdfBytes(
        lang === 'tr' ? 'Teknik Sartname - Bolum 2' : 'Technical Specification - Part 2',
        lang === 'tr' ? 'PDF Labs Ornek Belge B' : 'PDF Labs Sample Document B',
        lang === 'tr'
          ? [
              'Ikinci belgedeki sayfalar birlestirildiginde otomatik olarak numaralanir.',
              'Sayfa numarasi konumunu ve bicimini sagdaki panelden degistirebilirsiniz.',
            ]
          : [
              'Pages from the second document are automatically numbered once merged.',
              'Customize position and number format from the configuration panel.',
            ],
        2,
      );

      const [info1, info2] = await Promise.all([
        getPdfInfoAndThumb(sample1Bytes),
        getPdfInfoAndThumb(sample2Bytes),
      ]);

      setQueue([
        {
          id: `sample-1-${Date.now()}`,
          name: lang === 'tr' ? 'Sozlesme_Bolum_1.pdf' : 'Agreement_Part_1.pdf',
          bytes: sample1Bytes,
          pageCount: info1.pageCount,
          thumbnailUrl: info1.thumbnailUrl,
        },
        {
          id: `sample-2-${Date.now() + 1}`,
          name: lang === 'tr' ? 'Teknik_Sartname_2.pdf' : 'Technical_Specs_2.pdf',
          bytes: sample2Bytes,
          pageCount: info2.pageCount,
          thumbnailUrl: info2.thumbnailUrl,
        },
      ]);
      setResult(null);
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleMerge = async () => {
    if (queue.length === 0) return;
    setError(null);
    setIsProcessing(true);
    try {
      const merged = await mergePdfsAndNumber(
        queue.map((q) => q.bytes),
        numbering,
        lang,
        renderUnicodeStampPng,
      );
      setResult({
        bytes: merged.bytes,
        pageCount: merged.pageCount,
        filename: lang === 'tr' ? 'Birlestirilmis_Belge.pdf' : 'Merged_Document.pdf',
      });
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = queue.reduce((acc, item) => acc + item.pageCount, 0);
  const totalBytes = queue.reduce((acc, item) => acc + item.bytes.byteLength, 0);

  return (
    <div className="space-y-6">
      <DropZone
        accept="application/pdf,.pdf"
        title={t.common.dropTitle}
        hint={t.common.dropHint}
        selectLabel={t.merge.addMorePdfs}
        sampleLabel={t.merge.sampleBtn}
        onFilesSelected={handleAddFiles}
        onLoadSample={handleLoadSamples}
        sampleLoading={isLoadingSample}
      />

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {result && (
        <PdfResultBanner
          title={t.merge.resultTitle}
          filename={result.filename}
          bytes={result.bytes}
          pageCount={result.pageCount}
          t={t}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: PDF Queue */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                {t.merge.fileQueueTitle}
              </h2>
              {queue.length > 0 && (
                <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                  {queue.length} {t.common.filesCount} · {totalPages} {t.common.pages} ·{' '}
                  {formatFileSize(totalBytes)}
                </p>
              )}
            </div>

            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQueue([]);
                  setResult(null);
                }}
                className="text-xs font-medium text-slate-600 hover:text-red-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {t.common.clearAll}
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2.5" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">{t.common.emptyQueueTitle}</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {t.common.emptyQueueDesc}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 mt-2">
              {queue.map((item, idx) => (
                <li
                  key={item.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-xs font-mono tabular-nums text-slate-400 text-right shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="w-10 h-13 rounded border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        {item.pageCount} {item.pageCount === 1 ? t.common.page : t.common.pages} ·{' '}
                        {formatFileSize(item.bytes.byteLength)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => {
                        setQueue((prev) => reorderItems(prev, idx, idx - 1));
                        setResult(null);
                      }}
                      aria-label={`${t.common.moveUp} ${item.name}`}
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === queue.length - 1}
                      onClick={() => {
                        setQueue((prev) => reorderItems(prev, idx, idx + 1));
                        setResult(null);
                      }}
                      aria-label={`${t.common.moveDown} ${item.name}`}
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQueue((prev) => prev.filter((q) => q.id !== item.id));
                        setResult(null);
                      }}
                      aria-label={`${t.common.remove} ${item.name}`}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right: Page Numbering Options + Primary CTA */}
        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100">
            <h2 className="font-display text-base font-semibold text-slate-900">
              {t.merge.numberingSectionTitle}
            </h2>
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={numbering.enabled}
                onChange={(e) =>
                  setNumbering((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>{t.merge.enableNumbering}</span>
            </label>
          </div>

          <div className={numbering.enabled ? 'space-y-4' : 'space-y-4 opacity-50 pointer-events-none'}>
            {/* 6-Position Grid */}
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-2">
                {t.merge.positionLabel}
              </span>
              <div className="grid grid-cols-3 gap-2">
                {POSITIONS.map((pos) => {
                  const active = numbering.position === pos;
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setNumbering((prev) => ({ ...prev, position: pos }))}
                      aria-pressed={active}
                      className={`px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'border-blue-700 bg-blue-50 text-blue-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {t.merge.positions[pos]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format */}
            <div>
              <label
                htmlFor="page-number-format"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t.merge.formatLabel}
              </label>
              <select
                id="page-number-format"
                value={numbering.format}
                onChange={(e) =>
                  setNumbering((prev) => ({
                    ...prev,
                    format: e.target.value as PageNumberFormat,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="page-x-of-y">{t.merge.formats['page-x-of-y']}</option>
                <option value="x-of-y">{t.merge.formats['x-of-y']}</option>
                <option value="page-x">{t.merge.formats['page-x']}</option>
                <option value="number-only">{t.merge.formats['number-only']}</option>
                <option value="custom">{t.merge.formats.custom}</option>
              </select>
            </div>

            {numbering.format === 'custom' && (
              <div>
                <label
                  htmlFor="custom-prefix"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t.merge.customPrefixLabel}
                </label>
                <input
                  id="custom-prefix"
                  type="text"
                  value={numbering.customPrefix ?? ''}
                  onChange={(e) =>
                    setNumbering((prev) => ({ ...prev, customPrefix: e.target.value }))
                  }
                  placeholder={t.merge.customPrefixPlaceholder}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="start-number"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t.merge.startNumberLabel}
                </label>
                <input
                  id="start-number"
                  type="number"
                  min={1}
                  max={9999}
                  value={numbering.startNumber}
                  onChange={(e) =>
                    setNumbering((prev) => ({
                      ...prev,
                      startNumber: Math.max(1, Number(e.target.value) || 1),
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="font-size"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  {t.merge.fontSizeLabel}
                </label>
                <select
                  id="font-size"
                  value={numbering.fontSize}
                  onChange={(e) =>
                    setNumbering((prev) => ({
                      ...prev,
                      fontSize: Number(e.target.value) || 10,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value={9}>9 pt</option>
                  <option value={10}>10 pt</option>
                  <option value={11}>11 pt</option>
                  <option value={12}>12 pt</option>
                  <option value={14}>14 pt</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={numbering.skipFirstPage}
                onChange={(e) =>
                  setNumbering((prev) => ({ ...prev, skipFirstPage: e.target.checked }))
                }
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>{t.merge.skipFirstPage}</span>
            </label>
          </div>

          <button
            type="button"
            disabled={queue.length === 0 || isProcessing}
            onClick={handleMerge}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Layers className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{isProcessing ? t.common.processing : t.merge.mergeButton}</span>
          </button>
        </aside>
      </div>
    </div>
  );
}
