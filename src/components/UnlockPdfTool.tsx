import { useState } from 'react';
import { Loader2, Lock, LockOpen } from 'lucide-react';
import type { Language, Translations } from '../i18n/translations';
import {
  encryptPdfBytes,
  formatFileSize,
  inspectPdfEncryption,
  unlockPdfBytes,
} from '../utils/pdfCore';
import { createSamplePdfBytes } from '../utils/pdfClient';
import { DropZone } from './DropZone';
import { PdfResultBanner } from './PdfResultBanner';

interface UnlockPdfToolProps {
  lang: Language;
  t: Translations;
}

export function UnlockPdfTool({ lang, t }: UnlockPdfToolProps) {
  const [sourceFile, setSourceFile] = useState<{
    name: string;
    bytes: Uint8Array;
    isEncrypted: boolean;
  } | null>(null);

  const [password, setPassword] = useState('');
  const [infoNote, setInfoNote] = useState<string | null>(null);
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
    setInfoNote(null);
    setResult(null);
    setIsLoadingFile(true);
    try {
      const inspection = await inspectPdfEncryption(bytes);
      setSourceFile({ name, bytes, isEncrypted: inspection.isEncrypted });
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
    setInfoNote(null);
    setIsLoadingFile(true);
    try {
      const plainBytes = await createSamplePdfBytes(
        lang === 'tr' ? 'Korumalı Örnek Belge' : 'Protected Sample Document',
        lang === 'tr' ? 'Örnek Parola: 1234' : 'Sample Password: 1234',
        lang === 'tr'
          ? [
              'Bu PDF dosyası tarayıcı içinde 1234 parolasıyla şifrelenmiştir.',
              'Şifre alanına 1234 yazarak kilidi kaldırabilirsiniz.',
            ]
          : [
              'This sample PDF was encrypted in-browser with password 1234.',
              'Enter 1234 below to unlock and download a clean unrestricted PDF.',
            ],
        2,
      );
      const locked = await encryptPdfBytes(plainBytes, {
        userPassword: '1234',
        allowPrinting: true,
        allowCopying: false,
        allowModifying: false,
      });
      await loadPdfBytes(
        lang === 'tr' ? 'Kilitli_Belge_Ornek.pdf' : 'Locked_Sample_Document.pdf',
        locked.bytes,
      );
      setPassword('');
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleUnlock = async () => {
    if (!sourceFile) return;
    setError(null);
    setInfoNote(null);
    setIsProcessing(true);
    try {
      const out = await unlockPdfBytes(sourceFile.bytes, password);
      const base = sourceFile.name.replace(/\.pdf$/i, '');
      setResult({
        bytes: out.bytes,
        pageCount: out.pageCount,
        filename: `${base}_${lang === 'tr' ? 'kilitsiz' : 'unlocked'}.pdf`,
      });
      if (!out.wasEncrypted) {
        setInfoNote(t.unlock.notEncryptedNote);
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'PASSWORD_REQUIRED') {
        setError(t.unlock.passwordNeededError);
      } else if (code === 'PASSWORD_INCORRECT') {
        setError(t.unlock.wrongPasswordError);
      } else {
        setError(t.common.errorGeneric);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <DropZone
        accept="application/pdf,.pdf"
        multiple={false}
        title={t.unlock.dropTitle}
        hint={t.unlock.dropHint}
        selectLabel={t.unlock.selectPdf}
        sampleLabel={t.unlock.loadSample}
        onFilesSelected={handleFilesSelected}
        onLoadSample={handleLoadSample}
        sampleLoading={isLoadingFile}
      />

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {infoNote && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {infoNote}
        </div>
      )}

      {result && (
        <PdfResultBanner
          title={t.unlock.resultTitle}
          filename={result.filename}
          bytes={result.bytes}
          pageCount={result.pageCount}
          t={t}
        />
      )}

      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        {!sourceFile ? (
          <div className="py-8 text-center">
            <Lock className="w-8 h-8 text-slate-300 mx-auto mb-2.5" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-700">{t.common.emptyQueueTitle}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{t.unlock.sampleHint}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="min-w-0">
                <p className="font-display text-sm font-semibold text-slate-900 truncate">
                  {sourceFile.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                  {formatFileSize(sourceFile.bytes.byteLength)} ·{' '}
                  {sourceFile.isEncrypted ? t.unlock.statusLocked : t.unlock.statusUnlocked}
                </p>
              </div>
              {sourceFile.isEncrypted ? (
                <Lock className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
              ) : (
                <LockOpen className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
              )}
            </div>

            {sourceFile.isEncrypted && (
              <div>
                <label htmlFor="unlock-pass" className="block text-xs font-medium text-slate-700 mb-1.5">
                  {t.unlock.passwordLabel}
                </label>
                <input
                  id="unlock-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUnlock();
                  }}
                  placeholder={t.unlock.passwordPlaceholder}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            )}

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleUnlock}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors cursor-pointer"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <LockOpen className="w-4 h-4" aria-hidden="true" />
              )}
              <span>{isProcessing ? t.common.processing : t.unlock.unlockButton}</span>
            </button>
          </>
        )}
      </section>
    </div>
  );
}
