import { useState } from 'react';
import { CheckCircle2, Download, FileText, Loader2, Lock } from 'lucide-react';
import type { Language, Translations } from '../i18n/translations';
import {
  encryptPdfBytes,
  formatFileSize,
  inspectPdfEncryption,
} from '../utils/pdfCore';
import {
  createSamplePdfBytes,
  getPdfInfoAndThumb,
  triggerBytesDownload,
} from '../utils/pdfClient';
import { DropZone } from './DropZone';

interface EncryptPdfToolProps {
  lang: Language;
  t: Translations;
}

export function EncryptPdfTool({ lang, t }: EncryptPdfToolProps) {
  const [sourceFile, setSourceFile] = useState<{
    name: string;
    bytes: Uint8Array;
    pageCount: number;
    thumbUrl: string;
  } | null>(null);

  const [userPassword, setUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(false);
  const [allowModifying, setAllowModifying] = useState(false);

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
      const inspection = await inspectPdfEncryption(bytes);
      if (inspection.isEncrypted) {
        setError(t.encrypt.alreadyEncryptedError);
        setSourceFile(null);
        return;
      }
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
        lang === 'tr' ? 'Gizli Sözleşme Taslağı' : 'Confidential Contract Draft',
        lang === 'tr' ? 'PDF Şifreleme Örnek Belgesi' : 'Encrypt PDF Sample Document',
        lang === 'tr'
          ? [
              'Bu belge 128-bit parola koruması eklemek için hazırlanmış örnek bir PDF dosyasıdır.',
              'Sağ panelden açılış parolasını ve izinleri belirleyerek koruma altına alabilirsiniz.',
            ]
          : [
              'This sample PDF is ready to be protected with a 128-bit open password.',
              'Configure document permissions and password on the right panel.',
            ],
        2,
      );
      await loadPdfBytes(lang === 'tr' ? 'Sozlesme_Taslagi.pdf' : 'Contract_Draft.pdf', bytes);
    } catch {
      setError(t.common.errorGeneric);
      setIsLoadingFile(false);
    }
  };

  const handleEncrypt = async () => {
    if (!sourceFile) return;
    setError(null);
    if (!userPassword.trim()) {
      setError(t.encrypt.passwordRequiredError);
      return;
    }
    if (userPassword !== confirmPassword) {
      setError(t.encrypt.passwordMismatchError);
      return;
    }

    setIsProcessing(true);
    try {
      const out = await encryptPdfBytes(sourceFile.bytes, {
        userPassword,
        ownerPassword,
        allowPrinting,
        allowCopying,
        allowModifying,
      });
      const base = sourceFile.name.replace(/\.pdf$/i, '');
      setResult({
        bytes: out.bytes,
        pageCount: out.pageCount,
        filename: `${base}_${lang === 'tr' ? 'sifreli' : 'encrypted'}.pdf`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg === 'PDF_ALREADY_ENCRYPTED' ? t.encrypt.alreadyEncryptedError : t.common.errorGeneric);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <DropZone
        accept="application/pdf,.pdf"
        multiple={false}
        title={t.encrypt.dropTitle}
        hint={t.encrypt.dropHint}
        selectLabel={t.encrypt.selectPdf}
        sampleLabel={t.encrypt.loadSample}
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
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900">{t.encrypt.resultTitle}</h3>
              <p className="text-xs text-slate-600 mt-0.5">{t.encrypt.resultNote}</p>
              <p className="text-xs text-slate-600 font-mono tabular-nums mt-1">
                {result.filename} · {result.pageCount} {result.pageCount === 1 ? t.common.page : t.common.pages} ·{' '}
                {formatFileSize(result.bytes.byteLength)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => triggerBytesDownload(result.bytes, result.filename)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>{t.common.downloadPdf}</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="font-display text-base font-semibold text-slate-900 pb-3 border-b border-slate-100">
            {sourceFile ? sourceFile.name : t.common.ready}
          </h2>
          {!sourceFile ? (
            <div className="py-12 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2.5" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">{t.common.emptyQueueTitle}</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{t.common.emptyQueueDesc}</p>
            </div>
          ) : (
            <div className="pt-4 flex items-center gap-4">
              <div className="w-24 aspect-[3/4] rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                {sourceFile.thumbUrl ? (
                  <img
                    src={sourceFile.thumbUrl}
                    alt={sourceFile.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <FileText className="w-6 h-6 text-slate-300" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{sourceFile.name}</p>
                <p className="text-xs text-slate-500 font-mono tabular-nums mt-1">
                  {sourceFile.pageCount} {t.common.pages} · {formatFileSize(sourceFile.bytes.byteLength)}
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900 pb-3 border-b border-slate-100">
            {t.encrypt.settingsTitle}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="enc-pass" className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.encrypt.userPasswordLabel}
              </label>
              <input
                id="enc-pass"
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder={t.encrypt.userPasswordPlaceholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label htmlFor="enc-confirm" className="block text-xs font-medium text-slate-700 mb-1.5">
                {t.encrypt.confirmPasswordLabel}
              </label>
              <input
                id="enc-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t.encrypt.confirmPasswordPlaceholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="enc-owner" className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.encrypt.ownerPasswordLabel}
            </label>
            <input
              id="enc-owner"
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              placeholder={t.encrypt.ownerPasswordPlaceholder}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="space-y-2 pt-1">
            <span className="block text-xs font-medium text-slate-700">
              {t.encrypt.permissionsLabel}
            </span>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowPrinting}
                onChange={(e) => setAllowPrinting(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>{t.encrypt.allowPrinting}</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowCopying}
                onChange={(e) => setAllowCopying(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>{t.encrypt.allowCopying}</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowModifying}
                onChange={(e) => setAllowModifying(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>{t.encrypt.allowModifying}</span>
            </label>
          </div>

          <button
            type="button"
            disabled={!sourceFile || isProcessing}
            onClick={handleEncrypt}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <Lock className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{isProcessing ? t.common.processing : t.encrypt.encryptButton}</span>
          </button>
        </aside>
      </div>
    </div>
  );
}
