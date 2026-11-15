import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Eye, EyeOff } from 'lucide-react';
import type { Translations } from '../i18n/translations';
import { formatFileSize } from '../utils/pdfCore';
import { triggerBytesDownload } from '../utils/pdfClient';

interface PdfResultBannerProps {
  title: string;
  filename: string;
  bytes: Uint8Array;
  pageCount: number;
  t: Translations;
}

export function PdfResultBanner({
  title,
  filename,
  bytes,
  pageCount,
  t,
}: PdfResultBannerProps) {
  const [showPreview, setShowPreview] = useState(false);

  const previewUrl = useMemo(() => {
    const blob = new Blob([bytes.slice()], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
  }, [bytes]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-900">{title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono tabular-nums">
              <span className="font-sans font-medium text-slate-800">{filename}</span>
              <span aria-hidden="true">·</span>
              <span>
                {pageCount} {pageCount === 1 ? t.common.page : t.common.pages}
              </span>
              <span aria-hidden="true">·</span>
              <span>{formatFileSize(bytes.byteLength)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {showPreview ? (
              <EyeOff className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Eye className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{showPreview ? t.common.hidePreview : t.common.previewPdf}</span>
          </button>

          <button
            type="button"
            onClick={() => triggerBytesDownload(bytes, filename, 'application/pdf')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>{t.common.downloadPdf}</span>
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="mt-4 rounded-lg overflow-hidden border border-slate-200 bg-white">
          <iframe
            title={filename}
            src={previewUrl}
            className="w-full h-[520px] border-0"
          />
        </div>
      )}
    </div>
  );
}
