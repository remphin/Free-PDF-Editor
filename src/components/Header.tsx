import type { Language, ToolTab, Translations } from '../i18n/translations';

interface HeaderProps {
  activeTab: ToolTab;
  onTabChange: (tab: ToolTab) => void;
  lang: Language;
  onLangChange: (lang: Language) => void;
  t: Translations;
}

export function Header({ activeTab, onTabChange, lang, onLangChange, t }: HeaderProps) {
  const navItems: Array<{ id: ToolTab; label: string }> = [
    { id: 'home', label: t.nav.home },
    { id: 'merge', label: t.nav.merge },
    { id: 'split', label: t.nav.split },
    { id: 'convert', label: t.nav.convert },
    { id: 'compress', label: t.nav.compress },
    { id: 'cad', label: t.nav.cad },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onTabChange('home');
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          {t.appName}
        </a>

        {/* Zone 2: Concise Single-line Quick Links */}
        <nav aria-label="Main tools" className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-4 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isActive
                    ? 'text-blue-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Bilingual Switcher Control */}
        <div className="flex items-center shrink-0">
          <div
            role="group"
            aria-label={lang === 'tr' ? 'Dil seçimi' : 'Language selection'}
            className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200"
          >
            <button
              type="button"
              onClick={() => onLangChange('tr')}
              aria-pressed={lang === 'tr'}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                lang === 'tr'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TR
            </button>
            <button
              type="button"
              onClick={() => onLangChange('en')}
              aria-pressed={lang === 'en'}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                lang === 'en'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Mobile compact single-row quick nav */}
      <nav
        aria-label="Mobile tools"
        className="md:hidden border-t border-slate-100 grid grid-cols-6 bg-white"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`px-0.5 py-2.5 text-[11px] font-medium text-center truncate border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-700 text-blue-700'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
