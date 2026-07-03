/**
 * ThemeContext — READ-ONLY observer of the Ownology theme system.
 *
 * `lib/themes.ts::applyThemeToDom` is the SINGLE writer of html theme
 * classes (theme-parchment, theme-soft-cellar, light-mode, dark). This
 * context observes the resolved `dark` class and provides it to shadcn/ui
 * components that call useTheme(). It does NOT write to classList — that
 * would fight the theme system and leak stale classes into portaled UI
 * (e.g. the OwnologyLogo trinity hover card).
 *
 * The ThemeToggle component (useOwnologyTheme) is the source of truth.
 */
import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  switchable = false,
}: ThemeProviderProps) {
  // Read initial theme from the html.dark class the theme system controls.
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  // Observe html class changes from ThemeToggle (useOwnologyTheme) — the
  // single writer. This context only READS to stay in sync.
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      setTheme(root.classList.contains("dark") ? "dark" : "light");
    };
    sync(); // ensure state matches DOM after mount even if init ran too early
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
