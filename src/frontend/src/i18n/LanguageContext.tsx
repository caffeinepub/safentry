import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { LANGUAGES, type LangCode, getTranslation } from "./translations";

const STORAGE_KEY = "safentry_lang";

interface LanguageContextValue {
  language: LangCode;
  setLanguage: (lang: LangCode) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
  hasSelectedLanguage: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "tr",
  setLanguage: () => {},
  t: (key) => key,
  dir: "ltr",
  hasSelectedLanguage: true,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LangCode>("tr");
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as LangCode | null;
    if (saved) {
      setLanguageState(saved);
      setHasSelectedLanguage(true);
    } else {
      setHasSelectedLanguage(false);
    }
  }, []);

  const setLanguage = useCallback((lang: LangCode) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
    setHasSelectedLanguage(true);
    const langConfig = LANGUAGES.find((l) => l.code === lang);
    document.documentElement.dir = langConfig?.dir === "rtl" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, []);

  useEffect(() => {
    const langConfig = LANGUAGES.find((l) => l.code === language);
    document.documentElement.dir = langConfig?.dir === "rtl" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: string) => {
      return getTranslation(language, key);
    },
    [language],
  );

  const dir =
    LANGUAGES.find((l) => l.code === language)?.dir === "rtl" ? "rtl" : "ltr";

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, dir, hasSelectedLanguage }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
