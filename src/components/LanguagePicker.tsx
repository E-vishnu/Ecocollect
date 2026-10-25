import React from 'react';
import { Globe, Check } from 'lucide-react';
import { SupportedLanguage, LANGUAGE_OPTIONS } from '../i18n/i18n';
import { useLanguage } from '../i18n/LanguageContext';

interface LanguagePickerProps {
  variant?: 'pills' | 'compact' | 'dropdown' | 'floating';
  className?: string;
  theme?: 'dark' | 'light' | 'emerald';
}

export const LanguagePicker: React.FC<LanguagePickerProps> = ({
  variant = 'pills',
  className = '',
  theme = 'light'
}) => {
  const { language, setLanguage } = useLanguage();
  const currentLang = language || 'en';

  const handleSelect = (lang: SupportedLanguage) => {
    setLanguage(lang);
  };

  if (variant === 'compact') {
    return (
      <div className={`relative shrink-0 ${className}`}>
        {/* Desktop & Tablet (sm and above): Direct multi-button switcher */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
          <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 shrink-0" />
          {LANGUAGE_OPTIONS.map((opt) => {
            const isActive = currentLang === opt.code;
            return (
              <button
                key={opt.code}
                id={`lang-compact-btn-${opt.code}`}
                onClick={() => handleSelect(opt.code)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                title={opt.label}
              >
                <span>{opt.flag}</span>
                <span>{opt.nativeLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile (< sm / 390px): Clean touch-friendly dropdown that never overflows and supports full Hindi/Kannada */}
        <div className="flex sm:hidden relative items-center">
          <select
            id="lang-mobile-compact-select"
            value={currentLang}
            onChange={(e) => handleSelect(e.target.value as SupportedLanguage)}
            className="appearance-none bg-slate-800 border border-slate-700 text-white rounded-xl pl-7 pr-6 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-xs max-w-[110px]"
            aria-label="Language selector"
          >
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code} className="bg-slate-900 text-white">
                {opt.flag} {opt.nativeLabel}
              </option>
            ))}
          </select>
          <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
          <div className="absolute right-2 pointer-events-none text-slate-400 text-[10px]">▼</div>
        </div>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-block ${className}`}>
        <select
          id="lang-select-dropdown"
          value={currentLang}
          onChange={(e) => handleSelect(e.target.value as SupportedLanguage)}
          className="appearance-none bg-white border border-slate-300 hover:border-emerald-500 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-xs"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.code} value={opt.code}>
              {opt.flag} {opt.nativeLabel} ({opt.label})
            </option>
          ))}
        </select>
        <Globe className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    );
  }

  // Default: 'pills'
  return (
    <div className={`inline-flex items-center gap-1.5 p-1 rounded-2xl ${
      theme === 'emerald'
        ? 'bg-emerald-800/40 border border-emerald-500/30'
        : theme === 'dark' 
          ? 'bg-slate-800 border border-slate-700' 
          : 'bg-slate-100 border border-slate-200'
    } ${className}`}>
      <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-slate-400">
        <Globe className={`w-3.5 h-3.5 ${theme === 'emerald' ? 'text-emerald-300' : 'text-slate-400'}`} />
        <span className={theme === 'emerald' ? 'text-emerald-200' : 'text-slate-500'}>i18n</span>
      </div>
      {LANGUAGE_OPTIONS.map((opt) => {
        const isActive = currentLang === opt.code;
        return (
          <button
            key={opt.code}
            id={`lang-pill-btn-${opt.code}`}
            onClick={() => handleSelect(opt.code)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              isActive
                ? theme === 'emerald'
                  ? 'bg-white text-emerald-900 shadow-sm font-extrabold'
                  : 'bg-emerald-600 text-white shadow-sm font-extrabold'
                : theme === 'emerald'
                  ? 'text-emerald-100 hover:text-white hover:bg-emerald-700/50'
                  : theme === 'dark'
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <span>{opt.flag}</span>
            <span>{opt.nativeLabel}</span>
            {isActive && <Check className="w-3 h-3" />}
          </button>
        );
      })}
    </div>
  );
};
