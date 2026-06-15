/**
 * ThemeContext — unified with the Ownology theme system.
 *
 * The Ownology theme system uses:
 *   - `html.light-mode` class for light theme (CSS variables in index.css)
 *   - No class for dark theme (default)
 *
 * shadcn/ui uses:
 *   - `html.dark` class for dark theme
 *   - No class for light theme
 *
 * This context bridges both: when light-mode is active, it removes `.dark`;
 * when dark mode is active, it adds `.dark`.
 *
 * The ThemeToggle component (useOwnologyTheme) is the single source of truth.
 * This context observes the `light-mode` class on <html> via MutationObserver
 * so shadcn/ui components stay in sync automatically.
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
  // Derive initial theme from the html element class (set by useOwnologyTheme on mount)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return document.documentElement.classList.contains("light-mode") ? "light" : "dark";
  });

  // Keep html.dark in sync with the Ownology light-mode class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light-mode");
    } else {
      root.classList.remove("dark");
      root.classList.add("light-mode");
    }
  }, [theme]);

  // Observe html class changes from ThemeToggle (useOwnologyTheme)
  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const isLight = root.classList.contains("light-mode");
      setTheme(isLight ? "light" : "dark");
    });
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
