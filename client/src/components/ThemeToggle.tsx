/**
 * ThemeToggle — switches between dark "Cellar Night" and light "Cellar Daylight"
 * Persists choice to localStorage. Applies/removes `light-mode` class on <html>.
 */
import { useEffect, useState } from "react";

export function useOwnologyTheme() {
  const [isLight, setIsLight] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("ownology-theme") === "light";
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isLight) {
      html.classList.add("light-mode");
      localStorage.setItem("ownology-theme", "light");
    } else {
      html.classList.remove("light-mode");
      localStorage.setItem("ownology-theme", "dark");
    }
  }, [isLight]);

  // Apply saved preference on first mount (before React hydrates)
  useEffect(() => {
    const saved = localStorage.getItem("ownology-theme");
    if (saved === "light") {
      document.documentElement.classList.add("light-mode");
      setIsLight(true);
    }
  }, []);

  return { isLight, toggle: () => setIsLight(v => !v) };
}

interface ThemeToggleProps {
  /** Pass true to show a compact icon-only button (for nav use) */
  compact?: boolean;
}

export default function ThemeToggle({ compact = true }: ThemeToggleProps) {
  const { isLight, toggle } = useOwnologyTheme();

  const AMBER = "var(--ow-amber)";

  return (
    <button
      onClick={toggle}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Cellar Night (dark)" : "Cellar Daylight (light)"}
      style={{
        background: "transparent",
        border: `1px solid ${isLight ? "oklch(0 0 0 / 0.18)" : "oklch(1 0 0 / 0.18)"}`,
        borderRadius: "4px",
        padding: compact ? "0.4rem 0.5rem" : "0.5rem 0.75rem",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        transition: "all 0.2s ease",
        color: AMBER,
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ow-amber)";
        (e.currentTarget as HTMLButtonElement).style.background = "oklch(from var(--ow-amber) l c h / 0.08)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = isLight ? "oklch(0 0 0 / 0.18)" : "oklch(1 0 0 / 0.18)";
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {isLight ? (
        /* Moon icon — switch to dark */
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path
            d="M7.5 1.5a6 6 0 1 0 6 6 4.5 4.5 0 0 1-6-6z"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        /* Sun icon — switch to light */
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.25"/>
          <path
            d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.05 3.05l1.06 1.06M10.89 10.89l1.06 1.06M3.05 11.95l1.06-1.06M10.89 4.11l1.06-1.06"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      )}
      {!compact && (
        <span style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 700,
          fontSize: "0.7rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ow-amber)",
        }}>
          {isLight ? "Night" : "Daylight"}
        </span>
      )}
    </button>
  );
}
