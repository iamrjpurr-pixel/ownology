/**
 * ThemeToggle — operator-grade theme picker.
 *
 * Themes come from the registry in `/app/client/src/lib/themes.ts`. The
 * `compact` prop renders a small icon button that opens a dropdown listing
 * every enabled theme with a name + short description. Each row is
 * keyboard accessible (arrows / enter / esc).
 *
 * Wineries swing between cellar-dark dawn and harvest-pad noon — operators
 * need to control this themselves, not have it forced by the brand. The
 * registry lets admin enable/disable themes (via VITE_ENABLED_THEMES env)
 * without code changes.
 *
 * Choice persists to localStorage under key "ownology-theme". `useOwnologyTheme`
 * remains the single source of truth and exports the same `isLight` shim so
 * existing call sites (Home, Orders, AdminVintage…) keep working.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  applyThemeToDom,
  DEFAULT_THEME_ID,
  getEnabledThemes,
  getTheme,
  resolveAutoTheme,
  THEMES,
  type ThemeId,
} from "@/lib/themes";

const STORAGE_KEY = "ownology-theme";
// Legacy storage values used by the previous 3-state toggle. Map them onto
// the new registry so returning users don't get stranded.
const LEGACY_MAP: Record<string, ThemeId> = {
  dark: "soft-cellar", // user complained pure-black was too harsh — bump to soft
  light: "parchment",
  system: "auto",
};

function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_THEME_ID;
  const mapped = LEGACY_MAP[raw] ?? (raw as ThemeId);
  return THEMES.some((t) => t.id === mapped) ? mapped : DEFAULT_THEME_ID;
}

/** Public hook — kept stable so existing pages don't break. */
export function useOwnologyTheme() {
  const [themeId, setThemeId] = useState<ThemeId>(() => readStoredTheme());
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Apply + persist on every change
  useEffect(() => {
    applyThemeToDom(themeId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, themeId);
    }
  }, [themeId]);

  // Listen for OS-level prefers-color-scheme flips. Only relevant when in auto.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
      if (themeId === "auto") applyThemeToDom("auto");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [themeId]);

  // Apply on mount in case the inline init missed (SSR-safe guard)
  useEffect(() => {
    applyThemeToDom(themeId);
  }, []);

  const select = useCallback((id: ThemeId) => setThemeId(id), []);

  // Legacy shim — many existing callers do `const { isLight } = useOwnologyTheme()`
  const effectiveKind = themeId === "auto"
    ? (systemPrefersDark ? "dark" : "light")
    : getTheme(themeId).kind;
  const isLight = effectiveKind === "light";

  // Legacy `cycle` and `toggle` — keep working but now they round-robin the
  // enabled themes in their declared registry order.
  const cycle = useCallback(() => {
    const enabled = getEnabledThemes();
    const idx = enabled.findIndex((t) => t.id === themeId);
    const next = enabled[(idx + 1) % enabled.length];
    setThemeId(next.id);
  }, [themeId]);

  return { choice: themeId, themeId, isLight, select, cycle, toggle: cycle };
}

interface ThemeToggleProps {
  /** Compact icon-only trigger (for nav use) */
  compact?: boolean;
}

export default function ThemeToggle({ compact = true }: ThemeToggleProps) {
  const { themeId, select } = useOwnologyTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const enabledThemes = useMemo(() => getEnabledThemes(), []);
  const current = getTheme(themeId);
  const effective = current.id === "auto" ? resolveAutoTheme() : current;

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const AMBER = "var(--ow-amber)";
  const triggerBorder = effective.kind === "dark"
    ? "oklch(1 0 0 / 0.18)"
    : "oklch(0 0 0 / 0.18)";

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }} data-testid="theme-picker-root">
      <button
        type="button"
        data-testid="theme-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}. Click to change.`}
        title={current.description}
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent",
          border: `1px solid ${triggerBorder}`,
          borderRadius: 4,
          padding: compact ? "0.4rem 0.55rem" : "0.5rem 0.85rem",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.45rem",
          color: AMBER,
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ow-amber)";
          (e.currentTarget as HTMLButtonElement).style.background = "oklch(from var(--ow-amber) l c h / 0.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = triggerBorder;
          (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        }}
      >
        <ThemeIcon kind={effective.kind} themeId={current.id} />
        {!compact && (
          <span
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
            }}
          >
            {current.label}
          </span>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Choose a theme"
          data-testid="theme-picker-menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 280,
            background: "var(--ow-bg-card)",
            border: "1px solid var(--ow-border-md)",
            borderRadius: 6,
            padding: 4,
            boxShadow: "0 12px 36px var(--ow-shadow)",
            zIndex: 80,
          }}
        >
          {enabledThemes.map((t) => {
            const isCurrent = t.id === themeId;
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={isCurrent}
                data-testid={`theme-option-${t.id}`}
                onClick={() => {
                  select(t.id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 12px",
                  background: isCurrent
                    ? "color-mix(in oklch, var(--ow-amber) 14%, transparent)"
                    : "transparent",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  textAlign: "left",
                  color: "var(--ow-text-hi)",
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "color-mix(in oklch, var(--ow-amber) 6%, transparent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }
                }}
              >
                <span style={{ marginTop: 2, color: "var(--ow-amber)", flexShrink: 0 }}>
                  <ThemeIcon kind={t.kind} themeId={t.id} />
                </span>
                <span style={{ flexGrow: 1 }}>
                  <span
                    style={{
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      color: "var(--ow-text-hi)",
                    }}
                  >
                    {t.label}
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: "0.62rem",
                          letterSpacing: "0.08em",
                          color: "var(--ow-amber)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                        }}
                      >
                        ✓ active
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 2,
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.74rem",
                      color: "var(--ow-text-lo)",
                      lineHeight: 1.4,
                    }}
                  >
                    {t.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Small SVG glyph matching the theme kind. */
function ThemeIcon({ kind, themeId }: { kind: "dark" | "light" | "system"; themeId: ThemeId }) {
  if (kind === "light") {
    return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.25" />
        <path
          d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3.05 3.05l1.06 1.06M10.89 10.89l1.06 1.06M3.05 11.95l1.06-1.06M10.89 4.11l1.06-1.06"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (kind === "system") {
    return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <rect x="3.5" y="1" width="8" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
        <circle cx="7.5" cy="11.5" r="0.75" fill="currentColor" />
        <path d="M5.5 3.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    );
  }
  // soft-cellar vs cellar — both dark, but draw a softer moon for soft-cellar
  if (themeId === "soft-cellar") {
    return (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path
          d="M7.5 2a5.5 5.5 0 1 0 4.6 8.4 5 5 0 0 1-4.6-8.4z"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity="0.15"
        />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <path
        d="M7.5 1.5a6 6 0 1 0 6 6 4.5 4.5 0 0 1-6-6z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
