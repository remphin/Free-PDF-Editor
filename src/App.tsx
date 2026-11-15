import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { translations, type Language, type ToolTab } from './i18n/translations';
import { Header } from './components/Header';
import { MergePdfTool } from './components/MergePdfTool';
import { SplitPdfTool } from './components/SplitPdfTool';
import { WordStudioTool } from './components/WordStudioTool';
import { ConverterTool } from './components/ConverterTool';
import { CompressPdfTool } from './components/CompressPdfTool';

export default function App() {
  const [lang, setLang] = useState<Language>('tr');
  const [activeTab, setActiveTab] = useState<ToolTab>('merge');

  const t = translations[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title =
      lang === 'tr'
        ? 'PDF Labs — PDF Birleştirme, Dönüştürme, Word Editör & Sıkıştırma'
        : 'PDF Labs — Merge PDF, Word Editor, Converter & Compressor';
  }, [lang]);

  const heroCopy: Record<ToolTab, { title: string; desc: string }> = {
    merge: { title: t.hero.mergeTitle, desc: t.hero.mergeDesc },
    split: { title: t.hero.splitTitle, desc: t.hero.splitDesc },
    word: { title: t.hero.wordTitle, desc: t.hero.wordDesc },
    convert: { title: t.hero.convertTitle, desc: t.hero.convertDesc },
    compress: { title: t.hero.compressTitle, desc: t.hero.compressDesc },
  };

  const activeHero = heroCopy[activeTab];

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lang={lang}
        onLangChange={setLang}
        t={t}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-7">
        <div className="mb-5 max-w-3xl">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
            {activeHero.title}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1.5 leading-relaxed">
            {activeHero.desc}
          </p>
        </div>

        {activeTab === 'merge' && <MergePdfTool lang={lang} t={t} />}
        {activeTab === 'split' && <SplitPdfTool lang={lang} t={t} />}
        {activeTab === 'word' && <WordStudioTool lang={lang} t={t} />}
        {activeTab === 'convert' && <ConverterTool lang={lang} t={t} />}
        {activeTab === 'compress' && <CompressPdfTool lang={lang} t={t} />}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3.5 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-display text-sm font-semibold text-slate-900">
                {t.common.privacyTitle}
              </p>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5 leading-relaxed">
                {t.common.privacyNote}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 pt-1">
            <span>{t.appName}</span>
            <span>Remphin / Powered by Serkan Çakmak</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
