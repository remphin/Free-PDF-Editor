import { useState } from 'react';
import { FileText, Loader2, Stamp } from 'lucide-react';
import type { Language, Translations } from '../i18n/translations';
import {
  applyTextWatermarkToPdf,
  formatFileSize,
  type WatermarkColor,
  type WatermarkLayout,
} from '../utils/pdfCore';
import {
  createSamplePdfBytes,
  getPdfInfoAndThumb,
  renderUnicodeStampPng,
} from '../utils/pdfClient';
import { DropZone } from './DropZone';
import { PdfResultBanner } from './PdfResultBanner';

interface WatermarkPdfToolProps {
  lang: Language;
  t: Translations;
}

export function WatermarkPdfTool({ lang, t }: WatermarkPdfToolProps) {
  const [sourceFile, setSourceFile] = useState<{
    name: string;
    bytes: Uint8Array;
    pageCount: number;
    thumbUrl: string;
  } | null>(null);

  const [text, setText] = useState(t.watermark.defaultText);
  const [layout, setLayout] = useState<WatermarkLayout>('diagonal');
  const [opacity, setOpacity] = useState(0.28);
  const [fontSize, setFontSize] = useState(40);
  const [color, setColor] = useState<WatermarkColor>('crimson');

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
      const { pageCount, thumbnailUrl } = await getPdfInfoAndThumb(bytes);
      setSourceFile({ name, bytes, pageCount, thumbUrl: thumbnailUrl });
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
        lang === 'tr' ? 'Finansal Teklif Taslağı' : 'Financial Proposal Draft',
        lang === 'tr' ? 'Filigran Örnek Belgesi' : 'Watermark Sample Document',
        lang === 'tr'
          ? [
              'Bu belge saydam metin filigranı uygulamasını test etmek için oluşturuldu.',
              'Sağ panelden konum, renk, yazı boyutu ve saydamlık ayarlarını seçebilirsiniz.',
            ]
          : [
              'This document was generated to test transparent text watermarking.',
              'Adjust layout, color, font size, and opacity from the settings panel.',
            ],
        2,
      );
      await loadPdfBytes(
        lang === 'tr' ? 'Teklif_Taslagi.pdf' : 'Proposal_Draft.pdf',
        bytes,
      );
    } catch {
      setError(t.common.errorGeneric);
      setIsLoadingFile(false);
    }
  };

  const handleApply = async () => {
    if (!sourceFile) return;
    setError(null);
    if (!text.trim()) {
      setError(t.watermark.emptyTextError);
      return;
    }

    setIsProcessing(true);
    try {
      const out = await applyTextWatermarkToPdf(
        sourceFile.bytes,
        { text, layout, opacity, fontSize, color },
        renderUnicodeStampPng,
      );
      const base = sourceFile.name.replace(/\.pdf$/i, '');
      setResult({
        bytes: out.bytes,
        pageCount: out.pageCount,
        filename: `${base}_${lang === 'tr' ? 'filigranli' : 'watermarked'}.pdf`,
      });
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsProcessing(false);
    }
  };

  const previewColorClass =
    color === 'crimson'
      ? 'text-red-600'
      : color === 'blue'
        ? 'text-blue-700'
        : 'text-slate-700';

  return (
    <div className="space-y-6">
      <DropZone
        accept="application/pdf,.pdf"
        multiple={false}
        title={t.watermark.dropTitle}
        hint={t.watermark.dropHint}
        selectLabel={t.watermark.selectPdf}
        sampleLabel={t.watermark.loadSample}
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
          title={t.watermark.resultTitle}
          filename={result.filename}
          bytes={result.bytes}
          pageCount={result.pageCount}
          t={t}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-display text-base font-semibold text-slate-900">
              {sourceFile ? sourceFile.name : t.watermark.previewLabel}
            </h2>
            {sourceFile && (
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {sourceFile.pageCount} {t.common.pages} · {formatFileSize(sourceFile.bytes.byteLength)}
              </span>
            )}
          </div>

          <div className="relative aspect-[3/4] max-w-sm mx-auto rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
            {sourceFile?.thumbUrl ? (
              <img
                src={sourceFile.thumbUrl}
                alt={sourceFile.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-center px-6">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" aria-hidden="true" />
                <p className="text-xs text-slate-500">{t.common.emptyQueueDesc}</p>
              </div>
            )}

            {/* Live Watermark Overlay Preview */}
            {text.trim() && (
              <div
                aria-hidden="true"
                style={{ opacity }}
                className={`pointer-events-none absolute inset-0 overflow-hidden flex ${
                  layout === 'diagonal'
                    ? 'items-center justify-center'
                    : layout === 'footer'
                      ? 'flex-col items-center justify-between py-5'
                      : 'grid grid-cols-2 grid-rows-3 place-items-center'
                }`}
              >
                {layout === 'diagonal' && (
                  <span
                    className={`font-display font-bold tracking-wider -rotate-[35deg] select-none text-center px-4 ${previewColorClass}`}
                    style={{ fontSize: `${Math.max(14, Math.round(fontSize * 0.65))}px` }}
                  >
                    {text}
                  </span>
                )}
                {layout === 'tiled' &&
                  Array.from({ length: 6 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`font-display font-bold -rotate-[30deg] select-none text-center px-1 ${previewColorClass}`}
                      style={{ fontSize: `${Math.max(11, Math.round(fontSize * 0.42))}px` }}
                    >
                      {text}
                    </span>
                  ))}
                {layout === 'footer' && (
                  <>
                    <span
                      className={`font-display font-bold select-none ${previewColorClass}`}
                      style={{ fontSize: `${Math.max(11, Math.round(fontSize * 0.4))}px` }}
                    >
                      {text}
                    </span>
                    <span
                      className={`font-display font-bold select-none ${previewColorClass}`}
                      style={{ fontSize: `${Math.max(11, Math.round(fontSize * 0.4))}px` }}
                    >
                      {text}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900 pb-3 border-b border-slate-100">
            {t.watermark.settingsTitle}
          </h2>

          <div>
            <label htmlFor="watermark-text" className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.watermark.textLabel}
            </label>
            <input
              id="watermark-text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.watermark.layoutLabel}
            </span>
            <div className="space-y-1.5">
              {(['diagonal', 'tiled', 'footer'] as WatermarkLayout[]).map((item) => {
                const active = layout === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setLayout(item)}
                    aria-pressed={active}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'border-blue-700 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {t.watermark.layouts[item]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="watermark-opacity" className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.watermark.opacityLabel} ({Math.round(opacity * 100)}%)
              </label>
              <input
                id="watermark-opacity"
                type="range"
                min={0.1}
                max={0.75}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full accent-blue-700"
              />
            </div>

            <div>
              <label htmlFor="watermark-size" className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.watermark.fontSizeLabel} ({fontSize} pt)
              </label>
              <input
                id="watermark-size"
                type="range"
                min={18}
                max={64}
                step={2}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-blue-700"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.watermark.colorLabel}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(['slate', 'crimson', 'blue'] as WatermarkColor[]).map((c) => {
                const active = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-pressed={active}
                    className={`px-2.5 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'border-blue-700 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {t.watermark.colors[c]}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            disabled={!sourceFile || isProcessing}
            onClick={handleApply}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Stamp className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{isProcessing ? t.common.processing : t.watermark.applyButton}</span>
          </button>
        </aside>
      </div>
    </div>
  );
}
