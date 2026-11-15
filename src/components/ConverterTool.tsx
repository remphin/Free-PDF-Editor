import { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FileType2,
  Image as ImageIcon,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import type { Language, Translations } from '../i18n/translations';
import { formatFileSize, mergePdfsAndNumber, reorderItems } from '../utils/pdfCore';
import {
  convertHtmlToPdfBytes,
  convertImagesToPdfBytes,
  createSampleImageBytes,
  triggerBytesDownload,
} from '../utils/pdfClient';
import {
  buildSheetHtmlTable,
  createSampleWorkbookBytes,
  parseWorkbookBytes,
  type ParsedSheet,
} from '../utils/spreadsheet';
import { createSampleDocxBytes, parseDocxBuffer } from '../utils/wordUtils';
import { DropZone } from './DropZone';
import { PdfResultBanner } from './PdfResultBanner';

type ConvertItemType = 'image' | 'word' | 'excel';

interface ConvertQueueItem {
  id: string;
  name: string;
  size: number;
  type: ConvertItemType;
  bytes: Uint8Array;
  mimeType: string;
  imageUrl?: string;
  wordHtml?: string;
  sheets?: ParsedSheet[];
}

interface IndividualResult {
  id: string;
  filename: string;
  bytes: Uint8Array;
  pageCount: number;
}

interface ConverterToolProps {
  lang: Language;
  t: Translations;
}

export function ConverterTool({ lang, t }: ConverterToolProps) {
  const [queue, setQueue] = useState<ConvertQueueItem[]>([]);
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'fit'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [combineAll, setCombineAll] = useState(true);
  const [addPageNumbers, setAddPageNumbers] = useState(false);

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [combinedResult, setCombinedResult] = useState<{
    bytes: Uint8Array;
    pageCount: number;
    filename: string;
  } | null>(null);
  const [individualResults, setIndividualResults] = useState<IndividualResult[]>([]);

  const detectFileCategory = (file: File): ConvertItemType | null => {
    const lower = file.name.toLowerCase();
    if (
      file.type.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(lower)
    ) {
      return 'image';
    }
    if (lower.endsWith('.docx')) {
      return 'word';
    }
    if (/\.(xlsx|xls|csv)$/i.test(lower)) {
      return 'excel';
    }
    return null;
  };

  const handleAddFiles = async (files: File[]) => {
    setError(null);
    const added: ConvertQueueItem[] = [];

    for (const file of files) {
      const cat = detectFileCategory(file);
      if (!cat) {
        setError(t.common.errorInvalidFile);
        continue;
      }

      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        if (cat === 'image') {
          const mimeType = file.type || 'image/png';
          const blob = new Blob([bytes.slice()], { type: mimeType });
          const imageUrl = URL.createObjectURL(blob);
          added.push({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            size: file.size,
            type: 'image',
            bytes,
            mimeType,
            imageUrl,
          });
        } else if (cat === 'word') {
          const parsed = await parseDocxBuffer(buffer);
          added.push({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            size: file.size,
            type: 'word',
            bytes,
            mimeType: file.type,
            wordHtml: parsed.html,
          });
        } else {
          const sheets = parseWorkbookBytes(buffer);
          added.push({
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            size: file.size,
            type: 'excel',
            bytes,
            mimeType: file.type,
            sheets,
          });
        }
      } catch {
        setError(t.common.errorGeneric);
      }
    }

    if (added.length > 0) {
      setQueue((prev) => [...prev, ...added]);
      setCombinedResult(null);
      setIndividualResults([]);
    }
  };

  const handleLoadSamples = async () => {
    setError(null);
    setIsLoadingSample(true);
    try {
      const [excelBytes, sampleImg, docxBytes] = await Promise.all([
        Promise.resolve(createSampleWorkbookBytes(lang)),
        createSampleImageBytes(lang),
        createSampleDocxBytes(
          lang === 'tr' ? 'Örnek Teknik Özet' : 'Sample Technical Summary',
          lang === 'tr' ? 'PDF Dönüştürücü Çıktısı' : 'PDF Converter Output',
          lang === 'tr'
            ? [
                'Görsel, Word ve Excel dosyaları sıralanarak tek bir PDF dosyasında veya ayrı PDF dosyaları olarak dışa aktarılabilir.',
              ]
            : [
                'Images, Word docs, and Excel spreadsheets can be converted together into one PDF or separate files.',
              ],
        ),
      ]);

      const sheets = parseWorkbookBytes(excelBytes);
      const parsedWord = await parseDocxBuffer(docxBytes.slice().buffer);
      const imgUrl = URL.createObjectURL(new Blob([sampleImg.bytes.slice()], { type: 'image/png' }));

      setQueue([
        {
          id: `conv-sample-xlsx-${Date.now()}`,
          name: lang === 'tr' ? 'Stok_Raporu.xlsx' : 'Inventory_Report.xlsx',
          size: excelBytes.byteLength,
          type: 'excel',
          bytes: excelBytes,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          sheets,
        },
        {
          id: `conv-sample-img-${Date.now() + 1}`,
          name: lang === 'tr' ? 'Proje_Ozeti.png' : 'Project_Brief.png',
          size: sampleImg.bytes.byteLength,
          type: 'image',
          bytes: sampleImg.bytes,
          mimeType: sampleImg.mimeType,
          imageUrl: imgUrl,
        },
        {
          id: `conv-sample-docx-${Date.now() + 2}`,
          name: lang === 'tr' ? 'Teknik_Ozet.docx' : 'Technical_Summary.docx',
          size: docxBytes.byteLength,
          type: 'word',
          bytes: docxBytes,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          wordHtml: parsedWord.html,
        },
      ]);
      setCombinedResult(null);
      setIndividualResults([]);
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const convertSingleItem = async (
    item: ConvertQueueItem,
    includeNumbers: boolean,
  ): Promise<{ bytes: Uint8Array; pageCount: number }> => {
    const numberingOpts = {
      enabled: includeNumbers,
      position: 'bottom-right' as const,
      format: 'page-x-of-y' as const,
      startNumber: 1,
      fontSize: 10,
      skipFirstPage: false,
    };

    if (item.type === 'image') {
      return convertImagesToPdfBytes(
        [{ bytes: item.bytes, mimeType: item.mimeType }],
        {
          pageSize,
          orientation,
          numbering: numberingOpts,
          lang,
        },
      );
    }

    const htmlBody =
      item.type === 'word'
        ? item.wordHtml || '<p></p>'
        : (item.sheets || []).map((sheet) => buildSheetHtmlTable(sheet)).join('');

    return convertHtmlToPdfBytes(htmlBody, {
      pageSize: pageSize === 'fit' ? 'a4' : pageSize,
      orientation,
      numbering: numberingOpts,
      lang,
    });
  };

  const handleConvert = async () => {
    if (queue.length === 0) return;
    setError(null);
    setIsProcessing(true);
    setCombinedResult(null);
    setIndividualResults([]);

    try {
      if (combineAll) {
        const pdfBuffers: Uint8Array[] = [];
        for (const item of queue) {
          const single = await convertSingleItem(item, false);
          pdfBuffers.push(single.bytes);
        }
        const merged = await mergePdfsAndNumber(
          pdfBuffers,
          {
            enabled: addPageNumbers,
            position: 'bottom-right',
            format: 'page-x-of-y',
            startNumber: 1,
            fontSize: 10,
            skipFirstPage: false,
          },
          lang,
        );
        setCombinedResult({
          bytes: merged.bytes,
          pageCount: merged.pageCount,
          filename: lang === 'tr' ? 'Donusturulmus_Belgeler.pdf' : 'Converted_Documents.pdf',
        });
      } else {
        const outList: IndividualResult[] = [];
        for (const item of queue) {
          const single = await convertSingleItem(item, addPageNumbers);
          const baseName = item.name.replace(/\.[^.]+$/, '');
          outList.push({
            id: item.id,
            filename: `${baseName}.pdf`,
            bytes: single.bytes,
            pageCount: single.pageCount,
          });
        }
        setIndividualResults(outList);
      }
    } catch {
      setError(t.common.errorGeneric);
    } finally {
      setIsProcessing(false);
    }
  };

  const previewItem = queue.find((item) => item.id === previewId) ?? null;

  return (
    <div className="space-y-6">
      <DropZone
        accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.svg,.docx,.xlsx,.xls,.csv"
        title={t.convert.dropTitle}
        hint={t.convert.dropHint}
        selectLabel={t.common.selectFiles}
        sampleLabel={t.convert.loadSamples}
        onFilesSelected={handleAddFiles}
        onLoadSample={handleLoadSamples}
        sampleLoading={isLoadingSample}
      />

      <p className="text-xs text-slate-500 text-center">{t.convert.supportedFormats}</p>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {combinedResult && (
        <PdfResultBanner
          title={t.convert.resultTitle}
          filename={combinedResult.filename}
          bytes={combinedResult.bytes}
          pageCount={combinedResult.pageCount}
          t={t}
        />
      )}

      {individualResults.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5 space-y-3">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            {t.convert.resultTitle}
          </h3>
          <ul className="divide-y divide-emerald-200/70 bg-white rounded-lg border border-emerald-200">
            {individualResults.map((res) => (
              <li key={res.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{res.filename}</p>
                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    {res.pageCount} {res.pageCount === 1 ? t.common.page : t.common.pages} ·{' '}
                    {formatFileSize(res.bytes.byteLength)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerBytesDownload(res.bytes, res.filename)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.common.downloadPdf}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {previewItem && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <h3 className="font-display text-sm font-semibold text-slate-900 truncate">
              {t.convert.previewItem}: {previewItem.name}
            </h3>
            <button
              type="button"
              onClick={() => setPreviewId(null)}
              aria-label={t.common.hidePreview}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {previewItem.type === 'image' && previewItem.imageUrl && (
            <div className="flex justify-center bg-slate-50 p-4 rounded-lg border border-slate-100">
              <img
                src={previewItem.imageUrl}
                alt={previewItem.name}
                referrerPolicy="no-referrer"
                className="max-h-80 object-contain rounded"
              />
            </div>
          )}

          {previewItem.type === 'word' && (
            <div
              className="word-editor-surface max-h-80 overflow-y-auto p-4 rounded-lg border border-slate-100 bg-slate-50/50"
              dangerouslySetInnerHTML={{ __html: previewItem.wordHtml || '' }}
            />
          )}

          {previewItem.type === 'excel' && (
            <div className="max-h-80 overflow-auto space-y-4">
              {(previewItem.sheets || []).map((sheet) => (
                <div key={sheet.name}>
                  <p className="text-xs font-semibold text-slate-700 mb-1.5">{sheet.name}</p>
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        {sheet.headers.map((h, i) => (
                          <th
                            key={i}
                            className="border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-left font-semibold text-slate-800"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.rows.slice(0, 30).map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className="border border-slate-200 px-2.5 py-1.5 text-slate-700 font-mono tabular-nums"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Queue */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                {t.convert.queueTitle}
              </h2>
              {queue.length > 0 && (
                <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                  {queue.length} {t.common.filesCount} ·{' '}
                  {formatFileSize(queue.reduce((acc, q) => acc + q.size, 0))}
                </p>
              )}
            </div>
            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQueue([]);
                  setCombinedResult(null);
                  setIndividualResults([]);
                  setPreviewId(null);
                }}
                className="text-xs font-medium text-slate-600 hover:text-red-700 cursor-pointer"
              >
                {t.common.clearAll}
              </button>
            )}
          </div>

          {queue.length === 0 ? (
            <div className="py-12 text-center">
              <FileType2 className="w-8 h-8 text-slate-300 mx-auto mb-2.5" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">{t.common.emptyQueueTitle}</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {t.common.emptyQueueDesc}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 mt-2">
              {queue.map((item, idx) => (
                <li key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.type === 'image' && item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : item.type === 'excel' ? (
                        <FileSpreadsheet className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-700" aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                        <span className="font-sans">{t.convert.typeLabels[item.type]}</span>
                        {item.type === 'excel' && item.sheets ? (
                          <>
                            {' '}
                            · {item.sheets.length} {t.convert.sheetCount}
                          </>
                        ) : null}{' '}
                        · {formatFileSize(item.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewId((prev) => (prev === item.id ? null : item.id))}
                      aria-label={`${t.convert.previewItem} ${item.name}`}
                      className="p-2 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => setQueue((prev) => reorderItems(prev, idx, idx - 1))}
                      aria-label={`${t.common.moveUp} ${item.name}`}
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === queue.length - 1}
                      onClick={() => setQueue((prev) => reorderItems(prev, idx, idx + 1))}
                      aria-label={`${t.common.moveDown} ${item.name}`}
                      className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQueue((prev) => prev.filter((q) => q.id !== item.id));
                        if (previewId === item.id) setPreviewId(null);
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

        {/* Settings Panel */}
        <aside className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <h2 className="font-display text-base font-semibold text-slate-900 pb-4 border-b border-slate-100">
            {t.convert.settingsTitle}
          </h2>

          <div>
            <label
              htmlFor="convert-page-size"
              className="block text-xs font-medium text-slate-700 mb-1.5"
            >
              {t.convert.pageSizeLabel}
            </label>
            <select
              id="convert-page-size"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as 'a4' | 'letter' | 'fit')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="a4">{t.convert.pageSizes.a4}</option>
              <option value="letter">{t.convert.pageSizes.letter}</option>
              <option value="fit">{t.convert.pageSizes.fit}</option>
            </select>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700 mb-1.5">
              {t.convert.orientationLabel}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(['portrait', 'landscape'] as const).map((ori) => (
                <button
                  key={ori}
                  type="button"
                  onClick={() => setOrientation(ori)}
                  aria-pressed={orientation === ori}
                  className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    orientation === ori
                      ? 'border-blue-700 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {t.convert.orientations[ori]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={combineAll}
                onChange={(e) => setCombineAll(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>{t.convert.combineAllLabel}</span>
            </label>

            <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={addPageNumbers}
                onChange={(e) => setAddPageNumbers(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>{t.convert.addPageNumbersLabel}</span>
            </label>
          </div>

          <button
            type="button"
            disabled={queue.length === 0 || isProcessing}
            onClick={handleConvert}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImageIcon className="w-4 h-4" aria-hidden="true" />
            )}
            <span>{isProcessing ? t.common.processing : t.convert.convertButton}</span>
          </button>
        </aside>
      </div>
    </div>
  );
}
