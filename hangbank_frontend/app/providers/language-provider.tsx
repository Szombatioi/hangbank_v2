"use client";

import { createContext, useContext, useEffect, useState } from "react";
import i18n from "../i18n";
import { useTranslation } from "react-i18next";

export type Language = string; //TODO: update this everytime you translate the page

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const {t} = useTranslation("common");
  const [language, setLanguageState] = useState<Language>("en");

  // Restore the previously chosen language on mount so the selection persists
  // across reloads. Runs client-side only (after hydration) to avoid SSR mismatch.
  useEffect(() => {
    const saved = localStorage.getItem("language");
    if (saved) {
      setLanguageState(saved);
      i18n.changeLanguage(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem("language", lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
