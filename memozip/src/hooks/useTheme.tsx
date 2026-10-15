import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ThemeName } from '@/types';
import { DEFAULT_THEME, isThemeName, themes, THEME_STORAGE_KEY } from '@/theme/themes';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  /** Cycles to the next theme. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readTheme(): ThemeName {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    // Old values ('dark', 'light', 'system') fall back to the default theme.
    return isThemeName(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(readTheme);
  const timer = useRef<number>();
  const first = useRef(true);

  useEffect(() => {
    const root = document.documentElement;
    // Fade colors only when the user switches (not on first paint).
    if (!first.current) {
      root.classList.add('theme-transition');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => root.classList.remove('theme-transition'), 420);
    }
    first.current = false;
    root.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', themes.find((t) => t.name === theme)?.browserColor ?? '#0F0C20');
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* storage unavailable: keep in memory only */
    }
  }, []);

  const toggle = useCallback(() => {
    const i = themes.findIndex((t) => t.name === theme);
    setTheme(themes[(i + 1) % themes.length].name);
  }, [theme, setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
