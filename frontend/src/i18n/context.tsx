import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { am } from "./am";
import { en, type TranslationTree } from "./en";

export type Locale = "en" | "am";

const STORAGE_KEY = "tefabign.locale";

const catalogs: Record<Locale, TranslationTree> = { en, am };

type LocaleContextValue = {
  locale: Locale;
  t: TranslationTree;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "am") {
      return stored;
    }
  } catch {
    // Ignore storage access errors (private mode, etc.).
  }
  return "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window === "undefined" ? "en" : readStoredLocale(),
  );

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore persistence failures.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = catalogs[locale].meta.siteTitle;
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      t: catalogs[locale],
      setLocale,
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
