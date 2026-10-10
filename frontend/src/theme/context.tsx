import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "tefabign.theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  /** True when the user has saved an explicit choice (not only system default). */
  hasExplicitPreference: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // Ignore storage errors.
  }
  return null;
}

function resolveSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readInitialTheme(): { theme: Theme; explicit: boolean } {
  const stored = readStoredTheme();
  if (stored) {
    return { theme: stored, explicit: true };
  }
  const fromDom = document.documentElement.getAttribute("data-theme");
  if (fromDom === "light" || fromDom === "dark") {
    return { theme: fromDom, explicit: false };
  }
  return { theme: resolveSystemTheme(), explicit: false };
}

function applyThemeToDocument(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const initial = readInitialTheme();
  const [theme, setThemeState] = useState<Theme>(initial.theme);
  const [hasExplicitPreference, setHasExplicitPreference] = useState(initial.explicit);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    setHasExplicitPreference(true);
    applyThemeToDocument(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore persistence failures.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [setTheme, theme]);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    if (hasExplicitPreference) {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = media.matches ? "dark" : "light";
      setThemeState(next);
      applyThemeToDocument(next);
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [hasExplicitPreference]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      hasExplicitPreference,
    }),
    [theme, setTheme, toggleTheme, hasExplicitPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
