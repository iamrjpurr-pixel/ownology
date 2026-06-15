/**
 * ThemeToggle — three-state cycle: Dark → Light → System
 *
 * "System" follows the device's prefers-color-scheme media query, which on
 * modern phones is driven by the ambient light sensor or the user's display
 * settings — so it automatically switches between Cellar Night and Cellar
 * Daylight without any manual action.
 *
 * Persists choice to localStorage under key "ownology-theme".
 * Applies/removes `light-mode` class on <html>.
 */
import { useEffect, useState, useCallback } from "react";

type ThemeChoice = "dark" | "light" | "system";

function applyTheme(choice: ThemeChoice) {
  const html = document.documentElement;
  if (choice === "light") {
    html.classList.add("light-mode");
  } else if (choice === "dark") {
    html.classList.remove("light-mode");
  } else {
    // system — read media query right now
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      html.classList.remove("light-mode");
    } else {
      html.classList.add("light-mode");
    }
  }
}

export function useOwnologyTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem("ownology-theme") as ThemeChoice | null;
    return stored ?? "dark";
  });

  // Derived boolean for components that only need light/dark
  const isLight =
    choice === "light" ||
    (choice === "system" && typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: light)").matches
      : false);

  // Apply theme whenever choice changes
  useEffect(() => {
    applyTheme(choice);
    localStorage.setItem("ownology-theme", choice);
  }, [choice]);

  // When in system mode, listen for OS-level changes (ambient light sensor / manual)
  useEffect(() => {
    if (choice !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [choice]);

  // Apply saved preference on first mount (before React hydrates)
  useEffect(() => {
    const saved = (localStorage.getItem("ownology-theme") as ThemeChoice | null) ?? "dark";
    applyTheme(saved);
  }, []);

  const cycle = useCallback(() => {
    setChoice(prev => {
      if (prev === "dark") return "light";
      if (prev === "light") return "system";
      return "dark";
    });
  }, []);

  // Legacy toggle shim — keeps existing callers working
  const toggle = cycle;

  return { choice, isLight, cycle, toggle };
}

interface ThemeToggleProps {
  /** Pass true to show a compact icon-only button (for nav use) */
  compact?: boolean;
}

export default function ThemeToggle({ compact = true }: ThemeToggleProps) {
  const { choice, cycle } = useOwnologyTheme();

  const AMBER = "var(--ow-amber)";

  const isDarkBg = choice === "dark" || (choice === "system" && typeof window !== "undefined"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : true);

  const borderBase = isDarkBg ? "oklch(1 0 0 / 0.18)" : "oklch(0 0 0 / 0.18)";

  // Labels and icons for each state
  const config: Record<ThemeChoice, { label: string; title: string; icon: React.ReactNode }> = {
    dark: {
      label: "Night",
      title: "Cellar Night — click for Daylight",
      icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path
            d="M7.5 1.5a6 6 0 1 0 6 6 4.5 4.5 0 0 1-6-6z"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    light: {
      label: "Daylight",
      title: "Cellar Daylight — click for System",
      icon: (
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.25" />
          <path
            d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.05 3.05l1.06 1.06M10.89 10.89l1.06 1.06M3.05 11.95l1.06-1.06M10.89 4.11l1.06-1.06"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    system: {
      label: "Auto",
      title: "Auto (follows phone brightness) — click for Night",
      icon: (
        /* Phone/display icon */
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <rect x="3.5" y="1" width="8" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
          <circle cx="7.5" cy="11.5" r="0.75" fill="currentColor" />
          <path d="M5.5 3.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      ),
    },
  };

  const current = config[choice];

  return (
    <button
      onClick={cycle}
      aria-label={current.title}
      title={current.title}
      style={{
        background: "transparent",
        border: `1px solid ${borderBase}`,
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
        (e.currentTarget as HTMLButtonElement).style.borderColor = borderBase;
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
    >
      {current.icon}
      {!compact && (
        <span style={{
          fontFamily: "'Lato', sans-serif",
          fontWeight: 700,
          fontSize: "0.7rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ow-amber)",
        }}>
          {current.label}
        </span>
      )}
    </button>
  );
}
