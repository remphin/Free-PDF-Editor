import { useState } from 'react';
import { Check, FileWarning, Loader2, Wrench } from 'lucide-react';
import type { Language, Translations } from '../i18n/translations';
import {
  createCorruptedSamplePdfBytes,
  formatFileSize,
  type RepairDiagnostics,
} from '../utils/pdfCore';
import { repairPdfBytesWithFallback } from '../utils/pdfClient';
import { DropZone } from './DropZone';
import { PdfResultBanner } from './PdfResultBanner';

interface RepairPdfToolProps {
  lang: Language;
  t: Translations;
}

export function RepairPdfTool({ lang, t }: RepairPdfToolProps) {
  const [sourceFile, setSourceFile] = useState<{
    name: string;
    bytes: Uint8Array;
  } | null>(null);

  const [result, setResult] = useState<{
    bytes: Uint8Array;
    filename: string;
    diagnostics: RepairDiagnostics;
  } | null>(null);

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError(t.common.errorInvalidFile);
      return;
    }
    setError(null);
    setResult(null);
    const buf = await file.arrayBuffer();
    setSourceFile({ name: file.name, bytes: new Uint8Array(buf) });
  };

  const handleLoadSample = async () => {
    setError(null);
    setResult(null);
    setIsLoadingFile(true);
    try {
      const corruptBytes = await createCorruptedSamplePdfBytes(lang);
      setSourceFile({
        name: lang === 'tr' ? 'Hasarli_Ornek_Belge.pdf' : 'Corrupted_Sample_Document.pdf',
        bytes: corruptBytes,
      });
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleRepair = async () => {
    if (!sourceFile) return;
    setError(null);
    setIsProcessing(true);
    try {
      const out = await repairPdfBytesWithFallback(sourceFile.bytes);
      const base = sourceFile.name.replace(/\.pdf$/i, '');
      setResult({
        bytes: out.bytes,
        filename: `${base}_${lang === 'tr' ? 'onarilmis' : 'repaired'}.pdf`,
        diagnostics: out.diagnostics,
      });
    } catch {
      setError(t.repair.cannotRepairError);
    } finally {
      setIsProcessing(false);
    }
  };

  const diagnosticItems = result
    ? [
        result.diagnostics.headerNormalized ? t.repair.headerNormalized : null,
        result.diagnostics.eofRestored ? t.repair.eofRestored : null,
        result.diagnostics.xrefRebuilt ? t.repair.xrefRebuilt : null,
        result.diagnostics.rasterFallbackUsed ? t.repair.rasterFallbackUsed : null,
      ].filter((item): item is string => Boolean(item))
    : [];

  return (
    <div className="space-y-6">
      <DropZone
        accept="application/pdf,.pdf"
        multiple={false}
        title={t.repair.dropTitle}
        hint={t.repair.dropHint}
        selectLabel={t.repair.selectPdf}
        sampleLabel={t.repair.loadSample}
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
        <div className="space-y-4">
          <PdfResultBanner
            title={t.repair.resultTitle}
            filename={result.filename}
            bytes={result.bytes}
            pageCount={result.diagnostics.recoveredPages}
            t={t}
          />

          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h3 className="font-display text-sm font-semibold text-slate-900">
                {t.repair.diagnosticsTitle}
              </h3>
              <span className="text-xs font-mono tabular-nums text-emerald-700 font-medium">
                {t.repair.pagesRecoveredLabel}: {result.diagnostics.recoveredPages}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {result.diagnostics.headerNormalized ||
              result.diagnostics.eofRestored ||
              result.diagnostics.rasterFallbackUsed
                ? t.repair.statusRecovered
                : t.repair.statusHealthy}
            </p>
            <ul className="space-y-1.5">
              {diagnosticItems.map((line) => (
                <li key={line} className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        {!sourceFile ? (
          <div className="py-8 text-center">
            <FileWarning className="w-8 h-8 text-slate-300 mx-auto mb-2.5" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">{t.common.emptyQueueTitle}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {t.common.emptyQueueDesc}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-slate-900 truncate">
                  {sourceFile.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                  {formatFileSize(sourceFile.bytes.byteLength)}
                </p>
              </div>
              <Wrench className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
            </div>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleRepair}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Wrench className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{isProcessing ? t.common.processing : t.repair.repairButton}</span>
            </button>
          </>
        )}
      </section>
    </div>
  );
}
