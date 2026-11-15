import { useEffect, useId, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  FileDown,
  FilePlus2,
  FileText,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Merge,
  Redo2,
  RemoveFormatting,
  SeparatorHorizontal,
  Trash2,
  Underline,
  Undo2,
  Upload,
} from 'lucide-react';
import type { Language, Translations } from '../i18n/translations';
import { formatFileSize, reorderItems } from '../utils/pdfCore';
import { convertHtmlToPdfBytes, triggerBytesDownload } from '../utils/pdfClient';
import {
  createSampleDocxBytes,
  exportHtmlToDocxBytes,
  parseDocxBuffer,
} from '../utils/wordUtils';
import { PdfResultBanner } from './PdfResultBanner';

interface WordQueueItem {
  id: string;
  name: string;
  size: number;
  html: string;
}

interface WordStudioToolProps {
  lang: Language;
  t: Translations;
}

export function WordStudioTool({ lang, t }: WordStudioToolProps) {
  const fileInputId = useId();
  const docNameInputId = useId();
  const editorRef = useRef<HTMLDivElement>(null);

  const [queue, setQueue] = useState<WordQueueItem[]>([]);
  const [pageBreakBetween, setPageBreakBetween] = useState(true);
  const [includePageNumbers, setIncludePageNumbers] = useState(true);
  const [docFilename, setDocFilename] = useState(t.word.defaultDocName);
  const [hasContent, setHasContent] = useState(false);

  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfResult, setPdfResult] = useState<{
    bytes: Uint8Array;
    pageCount: number;
    filename: string;
  } | null>(null);

  useEffect(() => {
    setDocFilename(t.word.defaultDocName);
  }, [t.word.defaultDocName]);

  const syncEditorHasContent = () => {
    const text = editorRef.current?.innerText?.trim() ?? '';
    setHasContent(text.length > 0 || (editorRef.current?.innerHTML?.includes('<table') ?? false));
  };

  const applyQueueToEditor = (items: WordQueueItem[], useBreaks: boolean) => {
    if (!editorRef.current || items.length === 0) return;
    const separator = useBreaks
      ? `<hr class="doc-page-break" data-label="${t.word.pageBreakLabel}" />`
      : '<p><br/></p>';
    const combinedHtml = items.map((item) => item.html).join(separator);
    editorRef.current.innerHTML = combinedHtml;
    syncEditorHasContent();
    setPdfResult(null);
    setStatusMessage(null);
  };

  const handleAddFiles = async (files: File[]) => {
    setError(null);
    const added: WordQueueItem[] = [];
    for (const file of files) {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.docx')) {
        setError(t.common.errorInvalidFile);
        continue;
      }
      try {
        const buffer = await file.arrayBuffer();
        const parsed = await parseDocxBuffer(buffer);
        added.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          size: file.size,
          html: parsed.html,
        });
      } catch {
        setError(t.common.errorGeneric);
      }
    }

    if (added.length > 0) {
      setQueue((prev) => {
        const next = [...prev, ...added];
        if (prev.length === 0) {
          setTimeout(() => applyQueueToEditor(next, pageBreakBetween), 0);
        }
        return next;
      });
    }
  };

  const handleLoadSampleWordDocs = async () => {
    setError(null);
    setIsLoadingSample(true);
    try {
      const bytes1 = await createSampleDocxBytes(
        lang === 'tr' ? 'Proje Teklif Dosyası — Bölüm 1' : 'Project Proposal — Section 1',
        lang === 'tr' ? 'Yönetici Özeti ve Kapsam' : 'Executive Summary & Scope',
        lang === 'tr'
          ? [
              'Bu belge, Word dosyalarını tek bir düzenlenebilir alanda birleştirme sürecini göstermek için hazırlanmıştır.',
              'Metinleri doğrudan düzenleyebilir, yeni başlıklar ekleyebilir ve çıktıyı hem PDF hem de Word (.docx) olarak kaydedebilirsiniz.',
            ]
          : [
              'This document demonstrates merging multiple Word files inside a unified live editor.',
              'You can edit any paragraph directly, insert page breaks, and export as PDF or Word (.docx).',
            ],
      );

      const bytes2 = await createSampleDocxBytes(
        lang === 'tr' ? 'Teslimat Takvimi ve Bütçe — Bölüm 2' : 'Delivery Schedule & Budget — Section 2',
        lang === 'tr' ? 'Aşama Planlaması' : 'Milestone Breakdown',
        lang === 'tr'
          ? [
              '1. Hafta: Gereksinim analizi ve doküman mimarisi onayı.',
              '2. Hafta: Tasarım teslimi, kullanıcı testleri ve son PDF yayını.',
            ]
          : [
              'Week 1: Requirements sign-off and document structure review.',
              'Week 2: Final design delivery, QA validation, and PDF release.',
            ],
      );

      const [parsed1, parsed2] = await Promise.all([
        parseDocxBuffer(bytes1.slice().buffer),
        parseDocxBuffer(bytes2.slice().buffer),
      ]);

      const samples: WordQueueItem[] = [
        {
          id: `word-sample-1-${Date.now()}`,
          name: lang === 'tr' ? 'Teklif_Bolum_1.docx' : 'Proposal_Section_1.docx',
          size: bytes1.byteLength,
          html: parsed1.html,
        },
        {
          id: `word-sample-2-${Date.now() + 1}`,
          name: lang === 'tr' ? 'Takvim_Bolum_2.docx' : 'Schedule_Section_2.docx',
          size: bytes2.byteLength,
          html: parsed2.html,
        },
      ];

      setQueue(samples);
      applyQueueToEditor(samples, pageBreakBetween);
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const execCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncEditorHasContent();
  };

  const insertPageBreak = () => {
    editorRef.current?.focus();
    const breakHtml = `<hr class="doc-page-break" data-label="${t.word.pageBreakLabel}" /><p><br/></p>`;
    document.execCommand('insertHTML', false, breakHtml);
    syncEditorHasContent();
  };

  const handleSaveAsPdf = async () => {
    const html = editorRef.current?.innerHTML ?? '';
    if (!html.trim()) return;
    setError(null);
    setStatusMessage(null);
    setIsExportingPdf(true);
    try {
      const safeName = (docFilename.trim() || t.word.defaultDocName).replace(/\.pdf$/i, '');
      const out = await convertHtmlToPdfBytes(html, {
        pageSize: 'a4',
        orientation: 'portrait',
        numbering: {
          enabled: includePageNumbers,
          position: 'bottom-center',
          format: 'page-x-of-y',
          startNumber: 1,
          fontSize: 10,
          skipFirstPage: false,
        },
        lang,
      });
      setPdfResult({
        bytes: out.bytes,
        pageCount: out.pageCount,
        filename: `${safeName}.pdf`,
      });
      setStatusMessage(t.word.exportSuccessPdf);
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSaveAsDocx = async () => {
    const html = editorRef.current?.innerHTML ?? '';
    if (!html.trim()) return;
    setError(null);
    setStatusMessage(null);
    setIsExportingDocx(true);
    try {
      const safeName = (docFilename.trim() || t.word.defaultDocName).replace(/\.docx$/i, '');
      const bytes = await exportHtmlToDocxBytes(html);
      triggerBytesDownload(
        bytes,
        `${safeName}.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      setStatusMessage(t.word.exportSuccessDocx);
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsExportingDocx(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {statusMessage && !pdfResult && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {statusMessage}
        </div>
      )}

      {pdfResult && (
        <PdfResultBanner
          title={t.word.exportSuccessPdf}
          filename={pdfResult.filename}
          bytes={pdfResult.bytes}
          pageCount={pdfResult.pageCount}
          t={t}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Word Files Queue & Export Controls */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h2 className="font-display text-base font-semibold text-slate-900">
                {t.word.queueTitle}
              </h2>
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQueue([])}
                  className="text-xs font-medium text-slate-500 hover:text-red-700 cursor-pointer"
                >
                  {t.common.clearAll}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <label
                htmlFor={fileInputId}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.word.addWordFiles}</span>
                <input
                  id={fileInputId}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) handleAddFiles(files);
                    e.target.value = '';
                  }}
                />
              </label>

              <button
                type="button"
                onClick={handleLoadSampleWordDocs}
                disabled={isLoadingSample}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <FilePlus2 className="w-3.5 h-3.5 text-blue-700" aria-hidden="true" />
                <span>{t.word.loadSamples}</span>
              </button>
            </div>

            {queue.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-slate-200 rounded-lg">
                <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1.5" aria-hidden="true" />
                <p className="text-xs text-slate-500 px-4">{t.common.emptyQueueDesc}</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {queue.map((item, idx) => (
                  <li key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {idx + 1}. {item.name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums">
                        {formatFileSize(item.size)}
                      </p>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => setQueue((prev) => reorderItems(prev, idx, idx - 1))}
                        aria-label={`${t.common.moveUp} ${item.name}`}
                        className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === queue.length - 1}
                        onClick={() => setQueue((prev) => reorderItems(prev, idx, idx + 1))}
                        aria-label={`${t.common.moveDown} ${item.name}`}
                        className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQueue((prev) => prev.filter((q) => q.id !== item.id))}
                        aria-label={`${t.common.remove} ${item.name}`}
                        className="p-1.5 rounded text-slate-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {queue.length > 0 && (
              <div className="pt-2 space-y-3 border-t border-slate-100">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pageBreakBetween}
                    onChange={(e) => setPageBreakBetween(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>{t.word.pageBreakBetween}</span>
                </label>

                <button
                  type="button"
                  onClick={() => applyQueueToEditor(queue, pageBreakBetween)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                >
                  <Merge className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.word.mergeToEditor}</span>
                </button>
              </div>
            )}
          </div>

          {/* Export Settings Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <label
                htmlFor={docNameInputId}
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                {t.word.docNameLabel}
              </label>
              <input
                id={docNameInputId}
                type="text"
                value={docFilename}
                onChange={(e) => setDocFilename(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includePageNumbers}
                onChange={(e) => setIncludePageNumbers(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>{t.word.includePageNumbers}</span>
            </label>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={!hasContent || isExportingPdf}
                onClick={handleSaveAsPdf}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileDown className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{isExportingPdf ? t.common.processing : t.word.saveAsPdf}</span>
              </button>

              <button
                type="button"
                disabled={!hasContent || isExportingDocx}
                onClick={handleSaveAsDocx}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
              >
                {isExportingDocx ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FileText className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{t.word.saveAsDocx}</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Right: Live A4 Rich Document Editor */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-1">
            <ToolbarBtn
              icon={<Undo2 className="w-4 h-4" />}
              label={t.word.toolbar.undo}
              onClick={() => execCommand('undo')}
            />
            <ToolbarBtn
              icon={<Redo2 className="w-4 h-4" />}
              label={t.word.toolbar.redo}
              onClick={() => execCommand('redo')}
            />
            <span aria-hidden="true" className="w-px h-5 bg-slate-200 mx-1" />
            <ToolbarBtn
              icon={<Heading1 className="w-4 h-4" />}
              label={t.word.toolbar.h1}
              onClick={() => execCommand('formatBlock', 'H1')}
            />
            <ToolbarBtn
              icon={<Heading2 className="w-4 h-4" />}
              label={t.word.toolbar.h2}
              onClick={() => execCommand('formatBlock', 'H2')}
            />
            <button
              type="button"
              onClick={() => execCommand('formatBlock', 'P')}
              title={t.word.toolbar.paragraph}
              className="px-2 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 rounded cursor-pointer whitespace-nowrap"
            >
              P
            </button>
            <span aria-hidden="true" className="w-px h-5 bg-slate-200 mx-1" />
            <ToolbarBtn
              icon={<Bold className="w-4 h-4" />}
              label={t.word.toolbar.bold}
              onClick={() => execCommand('bold')}
            />
            <ToolbarBtn
              icon={<Italic className="w-4 h-4" />}
              label={t.word.toolbar.italic}
              onClick={() => execCommand('italic')}
            />
            <ToolbarBtn
              icon={<Underline className="w-4 h-4" />}
              label={t.word.toolbar.underline}
              onClick={() => execCommand('underline')}
            />
            <span aria-hidden="true" className="w-px h-5 bg-slate-200 mx-1" />
            <ToolbarBtn
              icon={<List className="w-4 h-4" />}
              label={t.word.toolbar.bulletList}
              onClick={() => execCommand('insertUnorderedList')}
            />
            <ToolbarBtn
              icon={<ListOrdered className="w-4 h-4" />}
              label={t.word.toolbar.orderedList}
              onClick={() => execCommand('insertOrderedList')}
            />
            <span aria-hidden="true" className="w-px h-5 bg-slate-200 mx-1" />
            <ToolbarBtn
              icon={<AlignLeft className="w-4 h-4" />}
              label={t.word.toolbar.alignLeft}
              onClick={() => execCommand('justifyLeft')}
            />
            <ToolbarBtn
              icon={<AlignCenter className="w-4 h-4" />}
              label={t.word.toolbar.alignCenter}
              onClick={() => execCommand('justifyCenter')}
            />
            <ToolbarBtn
              icon={<AlignRight className="w-4 h-4" />}
              label={t.word.toolbar.alignRight}
              onClick={() => execCommand('justifyRight')}
            />
            <span aria-hidden="true" className="w-px h-5 bg-slate-200 mx-1" />
            <button
              type="button"
              onClick={insertPageBreak}
              title={t.word.toolbar.pageBreak}
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 rounded cursor-pointer whitespace-nowrap"
            >
              <SeparatorHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t.word.toolbar.pageBreak}</span>
            </button>
            <ToolbarBtn
              icon={<RemoveFormatting className="w-4 h-4" />}
              label={t.word.toolbar.clearFormat}
              onClick={() => execCommand('removeFormat')}
            />
          </div>

          {/* Paper Canvas */}
          <div className="bg-slate-100/70 p-4 sm:p-8 min-h-[540px]">
            <div className="relative max-w-[740px] mx-auto bg-white border border-slate-200 shadow-xs rounded-sm min-h-[480px] p-8 sm:p-12">
              {!hasContent && (
                <p
                  aria-hidden="true"
                  className="pointer-events-none absolute top-8 sm:top-12 left-8 sm:left-12 right-8 text-slate-400 text-sm"
                >
                  {t.word.editorPlaceholder}
                </p>
              )}
              <div
                ref={editorRef}
                role="textbox"
                aria-multiline="true"
                aria-label={t.word.editorTitle}
                contentEditable
                suppressContentEditableWarning
                onInput={syncEditorHasContent}
                className="word-editor-surface min-h-[400px] focus:outline-none"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ToolbarBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="p-2 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors cursor-pointer"
    >
      {icon}
    </button>
  );
}
