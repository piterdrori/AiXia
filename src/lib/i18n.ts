import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LANGUAGE_STORAGE_KEY,
  languageOptions,
  translations,
  type Language,
} from "@/lib/translations";

type TranslateParams = Record<string, string | number>;

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (path: string, fallback?: string, params?: TranslateParams) => string;
  languageOptions: typeof languageOptions;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLanguage(value: string | null | undefined): value is Language {
  return value === "en" || value === "zh" || value === "ru";
}

function getNestedValue(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, source);
}

function interpolate(template: string, params?: TranslateParams) {
  if (!params) return template;

  return template.replace(/\{\{(.*?)\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim();
    const value = params[key];
    return value === undefined ? "" : String(value);
  });
}

function applyLanguageToDocument(language: Language) {
  document.documentElement.lang = language;
  document.documentElement.setAttribute("data-language", language);
}

function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "en";

  const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguage(saved)) return saved;

  const browserLanguage = window.navigator.language.toLowerCase();

  if (browserLanguage.startsWith("zh")) return "zh";
  if (browserLanguage.startsWith("ru")) return "ru";

  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    applyLanguageToDocument(language);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
  }, []);

  const t = useCallback(
    (path: string, fallback?: string, params?: TranslateParams) => {
      const current = getNestedValue(translations[language], path);
      if (typeof current === "string") return interpolate(current, params);

      const english = getNestedValue(translations.en, path);
      if (typeof english === "string") return interpolate(english, params);

      return fallback || path;
    },
    [language]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t,
      languageOptions,
    }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
