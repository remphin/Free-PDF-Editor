import { useState } from 'react';
import {
  ArrowRight,
  FileDown,
  FileImage,
  FileOutput,
  FileText,
  Layers,
  LayoutGrid,
  Lock,
  LockOpen,
  RotateCw,
  Scissors,
  Stamp,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ToolCategory, ToolId, Translations } from '../i18n/translations';

interface HomeHubProps {
  onSelectTool: (tool: ToolId) => void;
  t: Translations;
}

interface ToolDefinition {
  id: ToolId;
  icon: LucideIcon;
  toneClass: string;
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  { id: 'merge', icon: Layers, toneClass: 'bg-blue-50 text-blue-700 border-blue-100' },
  { id: 'split', icon: Scissors, toneClass: 'bg-sky-50 text-sky-700 border-sky-100' },
  { id: 'organize', icon: LayoutGrid, toneClass: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  { id: 'rotate', icon: RotateCw, toneClass: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  { id: 'compress', icon: FileDown, toneClass: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  { id: 'convert', icon: FileOutput, toneClass: 'bg-violet-50 text-violet-700 border-violet-100' },
  { id: 'pdf2img', icon: FileImage, toneClass: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'word', icon: FileText, toneClass: 'bg-blue-50 text-blue-800 border-blue-100' },
  { id: 'watermark', icon: Stamp, toneClass: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'encrypt', icon: Lock, toneClass: 'bg-rose-50 text-rose-700 border-rose-100' },
  { id: 'unlock', icon: LockOpen, toneClass: 'bg-teal-50 text-teal-700 border-teal-100' },
  { id: 'repair', icon: Wrench, toneClass: 'bg-orange-50 text-orange-700 border-orange-100' },
];

export function HomeHub({ onSelectTool, t }: HomeHubProps) {
  const [category, setCategory] = useState<ToolCategory>('all');

  const categories: ToolCategory[] = ['all', 'organize', 'convert', 'security'];

  const visibleTools = TOOL_DEFINITIONS.filter((tool) => {
    if (category === 'all') return true;
    return t.home.tools[tool.id].category === category;
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            {t.home.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1.5 leading-relaxed">
            {t.home.subtitle}
          </p>
        </div>

        <div
          role="group"
          aria-label="Tool categories"
          className="grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl w-full sm:w-auto"
        >
          {categories.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                aria-pressed={active}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer text-center ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.home.categories[cat]}
              </button>
            );
          })}
        </div>
      </section>

      <section
        aria-label={t.home.title}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5"
      >
        {visibleTools.map((tool) => {
          const meta = t.home.tools[tool.id];
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => onSelectTool(tool.id)}
              className="group relative flex flex-col justify-between text-left bg-white border border-slate-200 hover:border-blue-600 rounded-2xl p-4 sm:p-5 min-h-[188px] sm:aspect-[1.08/1] transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <div
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105 ${tool.toneClass}`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>
                <ArrowRight
                  className="w-4 h-4 text-slate-300 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all shrink-0 mt-1"
                  aria-hidden="true"
                />
              </div>

              <div className="mt-3">
                <h2 className="font-display text-sm sm:text-base font-semibold text-slate-900 group-hover:text-blue-800 transition-colors leading-snug">
                  {meta.title}
                </h2>
                <p className="text-xs sm:text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                  {meta.desc}
                </p>
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
