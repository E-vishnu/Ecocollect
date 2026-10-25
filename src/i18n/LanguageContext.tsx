import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import i18n, { SupportedLanguage, changeLanguage as i18nChangeLanguage } from './i18n';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, defaultText?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string, defaultText?: string) => defaultText || key
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('ecocollect_lang');
      if (saved === 'en' || saved === 'hi' || saved === 'kn') {
        return saved;
      }
    }
    return 'en';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('ecocollect_lang', lang);
    }
    i18nChangeLanguage(lang);
    setLanguageState(lang);
  };

  useEffect(() => {
    // Synchronize i18n instance on initial mount
    if (i18n.language !== language) {
      i18nChangeLanguage(language);
    }

    const handleLanguageChanged = (lng: string) => {
      if (lng === 'en' || lng === 'hi' || lng === 'kn') {
        setLanguageState(lng as SupportedLanguage);
      }
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [language]);

  const t = (key: string, defaultText?: string): string => {
    const translation = i18n.t(key, { defaultValue: defaultText || key });
    return translation || defaultText || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
