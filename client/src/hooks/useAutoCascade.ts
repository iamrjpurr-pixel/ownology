/**
 * useAutoCascade — auto-fire the crush cascade on landing.
 *
 * Mounts a one-shot timer that dispatches the `ownology:crush` event after
 * `delayMs` (default 2500). De-duped via sessionStorage so the cascade
 * doesn't replay if the visitor refreshes or navigates back.
 *
 * Wired into:
 *   - HiContact.tsx — every SMS prospect's first landing
 *   - Home.tsx Hero — any organic visitor with `?from=*` attribution
 *
 * Pass `enabled: false` to suppress (e.g. while contact data is loading).
 */
import { useEffect, useRef } from "react";

import type { ThemeId } from "@/lib/themes";

const VALID_CRUSH: ThemeId[] = ["red-crush", "white-crush"];

export interface UseAutoCascadeOpts {
  /** Which cascade to fire. Falsy values are ignored (no-op). */
  themeId: ThemeId | "red-crush" | "white-crush" | null | undefined;
  /** Milliseconds to wait after mount before firing. Default 2500. */
  delayMs?: number;
  /** sessionStorage key gating one-fire-per-session. Default 'ow_auto_cascade'. */
  sessionKey?: string;
  /** Set false to suppress (e.g. while a tRPC query is still loading). */
  enabled?: boolean;
}

export function useAutoCascade({
  themeId,
  delayMs = 2500,
  sessionKey = "ow_auto_cascade",
  enabled = true,
}: UseAutoCascadeOpts): void {
  const firedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!enabled) return;
    if (firedRef.current) return;
    if (!themeId || !VALID_CRUSH.includes(themeId as ThemeId)) return;

    // Respect reduced-motion users — never auto-fire animations
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // sessionStorage gate — fires once per browser tab session
    try {
      if (window.sessionStorage.getItem(sessionKey)) return;
    } catch {
      // Privacy mode — fall through and fire once per mount
    }

    firedRef.current = true;
    const handle = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("ownology:crush", { detail: { themeId } })
      );
      try {
        window.sessionStorage.setItem(sessionKey, String(Date.now()));
      } catch {
        // ignore
      }
    }, delayMs);
    return () => window.clearTimeout(handle);
  }, [themeId, delayMs, sessionKey, enabled]);
}

/** Day-of-week alternator for /home organic visitors who don't have a
 *  winery profile attached. Even date → Red Crush, odd → White. Gives
 *  social shares a 50/50 mix without random per-tab volatility. */
export function pickCrushByDay(): "red-crush" | "white-crush" {
  return new Date().getUTCDate() % 2 === 0 ? "red-crush" : "white-crush";
}
