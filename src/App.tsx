import { useEffect, useState } from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { translations, type Language, type ToolId, type ToolTab } from './i18n/translations';
import { Header } from './components/Header';
import { HomeHub } from './components/HomeHub';
import { MergePdfTool } from './components/MergePdfTool';
import { SplitPdfTool } from './components/SplitPdfTool';
import { OrganizePdfTool } from './components/OrganizePdfTool';
import { RotatePdfTool } from './components/RotatePdfTool';
import { WordStudioTool } from './components/WordStudioTool';
import { ConverterTool } from './components/ConverterTool';
import { PdfToImageTool } from './components/PdfToImageTool';
import { WatermarkPdfTool } from './components/WatermarkPdfTool';
import { EncryptPdfTool } from './components/EncryptPdfTool';
import { UnlockPdfTool } from './components/UnlockPdfTool';
import { RepairPdfTool } from './components/RepairPdfTool';
import { CompressPdfTool } from './components/CompressPdfTool';
import { CadViewerTool } from './components/CadViewerTool';

export default function App() {
  const [lang, setLang] = useState<Language>('tr');
  const [activeTab, setActiveTab] = useState<ToolTab>('home');

  const t = translations[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title =
      lang === 'tr'
        ? 'PDF Labs — Tüm PDF Araçları, Word Editör, Dönüştürme & Sıkıştırma'
        : 'PDF Labs — All-in-One Browser PDF Tools, Converter & Security';
  }, [lang]);

  const handleTabChange = (tab: ToolTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeHero = activeTab !== 'home' ? t.hero[activeTab as ToolId] : null;

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        lang={lang}
        onLangChange={setLang}
        t={t}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'home' ? (
          <HomeHub onSelectTool={(tool) => handleTabChange(tool)} t={t} />
        ) : (
          <>
            <div className="mb-5 max-w-3xl">
              <button
                type="button"
                onClick={() => handleTabChange('home')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-700 mb-3 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t.home.backToAll}</span>
              </button>
              {activeHero && (
                <>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
                    {activeHero.title}
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 mt-1.5 leading-relaxed">
                    {activeHero.desc}
                  </p>
                </>
              )}
            </div>

            {activeTab === 'merge' && <MergePdfTool lang={lang} t={t} />}
            {activeTab === 'split' && <SplitPdfTool lang={lang} t={t} />}
            {activeTab === 'organize' && <OrganizePdfTool lang={lang} t={t} />}
            {activeTab === 'rotate' && <RotatePdfTool lang={lang} t={t} />}
            {activeTab === 'compress' && <CompressPdfTool lang={lang} t={t} />}
            {activeTab === 'convert' && <ConverterTool lang={lang} t={t} />}
            {activeTab === 'pdf2img' && <PdfToImageTool lang={lang} t={t} />}
            {activeTab === 'word' && <WordStudioTool lang={lang} t={t} />}
            {activeTab === 'watermark' && <WatermarkPdfTool lang={lang} t={t} />}
            {activeTab === 'encrypt' && <EncryptPdfTool lang={lang} t={t} />}
            {activeTab === 'unlock' && <UnlockPdfTool lang={lang} t={t} />}
            {activeTab === 'repair' && <RepairPdfTool lang={lang} t={t} />}
            {activeTab === 'cad' && <CadViewerTool lang={lang} t={t} />}
          </>
        )}
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
