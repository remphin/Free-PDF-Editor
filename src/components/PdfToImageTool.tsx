import { useState } from 'react';
import { CheckCircle2, Download, FileImage, Loader2 } from 'lucide-react';
import type { Language, Translations } from '../i18n/translations';
import { formatFileSize } from '../utils/pdfCore';
import {
  createSamplePdfBytes,
  getPdfInfoAndThumb,
  renderPdfPagesToImages,
  triggerBytesDownload,
  type RenderedPageImage,
} from '../utils/pdfClient';
import { DropZone } from './DropZone';

interface PdfToImageToolProps {
  lang: Language;
  t: Translations;
}

export function PdfToImageTool({ lang, t }: PdfToImageToolProps) {
  const [sourceFile, setSourceFile] = useState<{
    name: string;
    bytes: Uint8Array;
    pageCount: number;
  } | null>(null);

  const [format, setFormat] = useState<'png' | 'jpg'>('png');
  const [scale, setScale] = useState<1 | 2 | 3>(2);
  const [images, setImages] = useState<RenderedPageImage[]>([]);

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPdfBytes = async (name: string, bytes: Uint8Array) => {
    setError(null);
    setImages([]);
    setIsLoadingFile(true);
    try {
      const { pageCount } = await getPdfInfoAndThumb(bytes);
      setSourceFile({ name, bytes, pageCount });
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
        lang === 'tr' ? 'Katalog Sayfaları' : 'Catalog Brochure',
        lang === 'tr' ? 'PDF’den Görsele Örneği' : 'PDF to Image Sample',
        lang === 'tr'
          ? [
              'Her PDF sayfası yüksek çözünürlüklü PNG veya JPG dosyasına dönüştürülür.',
              'Dönüşüm sonrasında sayfaları tek tek veya topluca indirebilirsiniz.',
            ]
          : [
              'Every PDF page exports cleanly as crisp PNG or JPG images.',
              'Download individual pages or grab the full set at once.',
            ],
        3,
      );
      await loadPdfBytes(lang === 'tr' ? 'Katalog_3_Sayfa.pdf' : 'Catalog_3_Pages.pdf', bytes);
    } catch {
      setError(t.common.errorGeneric);
      setIsLoadingFile(false);
    }
  };

  const handleConvert = async () => {
    if (!sourceFile) return;
    setError(null);
    setIsProcessing(true);
    try {
      const rendered = await renderPdfPagesToImages(sourceFile.bytes, format, scale);
      setImages(rendered);
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsProcessing(false);
    }
  };

  const baseName = sourceFile ? sourceFile.name.replace(/\.pdf$/i, '') : 'page';
  const ext = format === 'png' ? 'png' : 'jpg';
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';

  return (
    <div className="space-y-6">
      <DropZone
        accept="application/pdf,.pdf"
        multiple={false}
        title={t.pdf2img.dropTitle}
        hint={t.pdf2img.dropHint}
        selectLabel={t.pdf2img.selectPdf}
        sampleLabel={t.pdf2img.loadSample}
        onFilesSelected={handleFilesSelected}
        onLoadSample={handleLoadSample}
        sampleLoading={isLoadingFile}
      />

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              {sourceFile ? sourceFile.name : t.pdf2img.resultsTitle}
            </h2>
            {sourceFile && (
              <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                {sourceFile.pageCount} {t.common.pages} · {formatFileSize(sourceFile.bytes.byteLength)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <span className="block text-xs font-medium text-slate-700 mb-1">
                {t.pdf2img.formatLabel}
              </span>
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                {(['png', 'jpg'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    aria-pressed={format === fmt}
                    className={`px-3 py-1.5 text-xs font-semibold uppercase rounded-md cursor-pointer ${
                      format === fmt
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="pdf2img-scale" className="block text-xs font-medium text-slate-700 mb-1">
                {t.pdf2img.scaleLabel}
              </label>
              <select
                id="pdf2img-scale"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value) as 1 | 2 | 3)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value={1}>{t.pdf2img.scales['1']}</option>
                <option value={2}>{t.pdf2img.scales['2']}</option>
                <option value={3}>{t.pdf2img.scales['3']}</option>
              </select>
            </div>

            <button
              type="button"
              disabled={!sourceFile || isProcessing}
              onClick={handleConvert}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg cursor-pointer whitespace-nowrap"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <FileImage className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{isProcessing ? t.common.processing : t.pdf2img.convertButton}</span>
            </button>
          </div>
        </div>

        {images.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="text-sm font-semibold text-slate-900">
                  {t.pdf2img.resultsTitle} ({images.length})
                </span>
              </div>
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    images.forEach((img, idx) => {
                      setTimeout(() => {
                        triggerBytesDownload(img.bytes, `${baseName}_p${img.pageNumber}.${ext}`, mime);
                      }, idx * 180);
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.pdf2img.downloadAll}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((img) => (
                <div
                  key={img.pageNumber}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 flex flex-col justify-between gap-3"
                >
                  <div className="aspect-[3/4] w-full rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                    <img
                      src={img.dataUrl}
                      alt={`${t.common.page} ${img.pageNumber}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-mono tabular-nums text-slate-600">
                      <span className="font-semibold text-slate-900">
                        {lang === 'tr' ? `Sayfa ${img.pageNumber}` : `Page ${img.pageNumber}`}
                      </span>{' '}
                      · {img.width}×{img.height} · {formatFileSize(img.bytes.byteLength)}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        triggerBytesDownload(img.bytes, `${baseName}_p${img.pageNumber}.${ext}`, mime)
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.pdf2img.downloadImage}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center">
            <FileImage className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">
              {sourceFile ? t.common.ready : t.common.emptyQueueTitle}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {sourceFile ? t.pdf2img.dropHint : t.common.emptyQueueDesc}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
