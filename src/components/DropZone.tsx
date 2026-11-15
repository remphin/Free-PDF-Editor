import { useId, useState, type DragEvent } from 'react';
import { FilePlus2, Upload } from 'lucide-react';

interface DropZoneProps {
  accept: string;
  multiple?: boolean;
  title: string;
  hint: string;
  selectLabel: string;
  sampleLabel?: string;
  onFilesSelected: (files: File[]) => void;
  onLoadSample?: () => void;
  sampleLoading?: boolean;
}

export function DropZone({
  accept,
  multiple = true,
  title,
  hint,
  selectLabel,
  sampleLabel,
  onFilesSelected,
  onLoadSample,
  sampleLoading = false,
}: DropZoneProps) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length > 0) {
      onFilesSelected(dropped);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-xl border border-dashed transition-colors p-5 sm:p-6 text-center ${
        isDragging
          ? 'border-blue-600 bg-blue-50/60'
          : 'border-slate-300 bg-white hover:border-slate-400'
      }`}
    >
      <div className="mx-auto w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 mb-2.5">
        <Upload className="w-5 h-5" aria-hidden="true" />
      </div>
      <p className="font-display text-base font-semibold text-slate-900">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-lg mx-auto">{hint}</p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <label
          htmlFor={inputId}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2"
        >
          <Upload className="w-4 h-4" aria-hidden="true" />
          <span>{selectLabel}</span>
          <input
            id={inputId}
            type="file"
            accept={accept}
            multiple={multiple}
            className="sr-only"
            onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              if (selected.length > 0) {
                onFilesSelected(selected);
              }
              e.target.value = '';
            }}
          />
        </label>

        {onLoadSample && sampleLabel && (
          <button
            type="button"
            onClick={onLoadSample}
            disabled={sampleLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="w-4 h-4 text-blue-700" aria-hidden="true" />
            <span>{sampleLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
