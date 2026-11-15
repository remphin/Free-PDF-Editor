import { useState } from 'react';
import { CheckCircle2, Download, FileArchive, Loader2, Minimize2, Trash2 } from 'lucide-react';
import type { Language, Translations } from '../i18n/translations';
import { calculateCompressionSavings, formatFileSize } from '../utils/pdfCore';
import {
  compressPdfBytes,
  createHeavySamplePdfBytes,
  getPdfInfoAndThumb,
  triggerBytesDownload,
  type CompressionLevel,
} from '../utils/pdfClient';
import { DropZone } from './DropZone';

interface CompressQueueItem {
  id: string;
  name: string;
  originalBytes: Uint8Array;
  pageCount: number;
  status: 'pending' | 'compressing' | 'done';
  compressedBytes?: Uint8Array;
}

interface CompressPdfToolProps {
  lang: Language;
  t: Translations;
}

export function CompressPdfTool({ lang, t }: CompressPdfToolProps) {
  const [queue, setQueue] = useState<CompressQueueItem[]>([]);
  const [level, setLevel] = useState<CompressionLevel>('balanced');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddFiles = async (files: File[]) => {
    setError(null);
    const added: CompressQueueItem[] = [];
    for (const file of files) {
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError(t.common.errorInvalidFile);
        continue;
      }
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const info = await getPdfInfoAndThumb(bytes);
        added.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          originalBytes: bytes,
          pageCount: info.pageCount,
          status: 'pending',
        });
      } catch {
        setError(t.common.errorGeneric);
      }
    }
    if (added.length > 0) {
      setQueue((prev) => [...prev, ...added]);
    }
  };

  const handleLoadSample = async () => {
    setError(null);
    setIsLoadingSample(true);
    try {
      const sampleBytes = await createHeavySamplePdfBytes(lang);
      const info = await getPdfInfoAndThumb(sampleBytes);
      setQueue([
        {
          id: `heavy-sample-${Date.now()}`,
          name: lang === 'tr' ? 'Yillik_Rapor_Yuksek_Cozunurluk.pdf' : 'Annual_Report_HighRes.pdf',
          originalBytes: sampleBytes,
          pageCount: info.pageCount,
          status: 'pending',
        },
      ]);
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleCompressAll = async () => {
    if (queue.length === 0) return;
    setError(null);
    setIsProcessing(true);

    try {
      for (const item of queue) {
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'compressing' } : q)),
        );
        const compressed = await compressPdfBytes(item.originalBytes, level);
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'done', compressedBytes: compressed.bytes }
              : q,
          ),
        );
      }
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsProcessing(false);
    }
  };

  const completedItems = queue.filter((q) => q.status === 'done' && q.compressedBytes);

  return (
    <div className="space-y-6">
      <DropZone
        accept="application/pdf,.pdf"
        title={t.compress.dropTitle}
        hint={t.compress.dropHint}
        selectLabel={t.common.selectFiles}
        sampleLabel={t.compress.loadSample}
        onFilesSelected={handleAddFiles}
        onLoadSample={handleLoadSample}
        sampleLoading={isLoadingSample}
      />

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Compression Level Selector */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-base font-semibold text-slate-900">
            {t.compress.levelLabel}
          </h2>
          <div className="flex items-center gap-3">
            {completedItems.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  for (const item of completedItems) {
                    if (item.compressedBytes) {
                      const outName = item.name.replace(/\.pdf$/i, '_compressed.pdf');
                      triggerBytesDownload(item.compressedBytes, outName);
                    }
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>{t.compress.downloadAll}</span>
              </button>
            )}
            <button
              type="button"
              disabled={queue.length === 0 || isProcessing}
              onClick={handleCompressAll}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Minimize2 className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{isProcessing ? t.common.processing : t.compress.compressAll}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(['low', 'balanced', 'maximum'] as CompressionLevel[]).map((key) => {
            const active = level === key;
            const info = t.compress.levels[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setLevel(key)}
                aria-pressed={active}
                className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                  active
                    ? 'border-blue-700 bg-blue-50/70'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold text-slate-900">
                    {info.title}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{info.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Queue & Results Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {queue.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <FileArchive className="w-8 h-8 text-slate-300 mx-auto mb-2.5" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">{t.common.emptyQueueTitle}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {t.common.emptyQueueDesc}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">{t.compress.table.file}</th>
                  <th className="py-3 px-4 text-right">{t.compress.table.pages}</th>
                  <th className="py-3 px-4 text-right">{t.compress.table.original}</th>
                  <th className="py-3 px-4 text-right">{t.compress.table.compressed}</th>
                  <th className="py-3 px-4 text-right">{t.compress.table.savings}</th>
                  <th className="py-3 px-4 text-right">{t.compress.table.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {queue.map((item) => {
                  const savings = item.compressedBytes
                    ? calculateCompressionSavings(
                        item.originalBytes.byteLength,
                        item.compressedBytes.byteLength,
                      )
                    : null;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-medium text-slate-900 max-w-[260px] truncate">
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                        {item.pageCount}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                        {formatFileSize(item.originalBytes.byteLength)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 font-medium">
                        {item.status === 'compressing'
                          ? t.compress.compressing
                          : item.compressedBytes
                            ? formatFileSize(item.compressedBytes.byteLength)
                            : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {savings ? (
                          savings.isSmaller ? (
                            <span className="inline-flex items-center justify-end gap-1 text-emerald-700 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>-{savings.percentage}%</span>
                            </span>
                          ) : (
                            <span className="text-xs font-sans text-slate-500">
                              {t.compress.alreadyOptimal}
                            </span>
                          )
                        ) : (
                          <span className="text-xs font-sans text-slate-400">
                            {item.status === 'compressing' ? '...' : t.compress.pending}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {item.compressedBytes && (
                            <button
                              type="button"
                              onClick={() => {
                                const outName = item.name.replace(/\.pdf$/i, '_compressed.pdf');
                                triggerBytesDownload(item.compressedBytes!, outName);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer whitespace-nowrap"
                            >
                              <Download className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>{t.compress.download}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setQueue((prev) => prev.filter((q) => q.id !== item.id))}
                            aria-label={`${t.common.remove} ${item.name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
