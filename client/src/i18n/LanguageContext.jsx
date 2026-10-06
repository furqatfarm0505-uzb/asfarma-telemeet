import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';
import { Globe } from 'lucide-react';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('asfarma_lang') || 'uz';
  });

  useEffect(() => {
    localStorage.setItem('asfarma_lang', lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'uz' ? 'ru' : 'uz'));
  };

  const t = translations[lang] || translations.uz;

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageSwitcher({ className = '' }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`inline-flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200 text-xs font-bold select-none ${className}`}>
      <button
        type="button"
        onClick={() => setLang('uz')}
        className={`px-2.5 py-1 rounded-lg transition-all ${
          lang === 'uz'
            ? 'bg-orange-600 text-white shadow-sm font-black'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        title="Ўзбек тили"
      >
        O'Z
      </button>

      <button
        type="button"
        onClick={() => setLang('ru')}
        className={`px-2.5 py-1 rounded-lg transition-all ${
          lang === 'ru'
            ? 'bg-orange-600 text-white shadow-sm font-black'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        title="Русский язык"
      >
        RU
      </button>
    </div>
  );
}
