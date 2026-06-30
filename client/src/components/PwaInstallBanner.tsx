/**
 * PwaInstallBanner
 * ─────────────────
 * Subtle amber banner that appears at the bottom of the screen when the
 * browser signals the app is installable. Two install paths supported:
 *
 *   1. Chrome / Android / desktop Edge — browser fires beforeinstallprompt
 *      and we call .prompt() to show the native install dialog.
 *
 *   2. iOS Safari (Feb 2026) — never fires beforeinstallprompt, so we
 *      detect iOS UA and show a "Tap Share → Add to Home Screen" hint
 *      instead. No automatic install possible; users follow the OS flow.
 *
 * Dismissed permanently via localStorage.
 */

import { useEffect, useState } from "react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const DISMISSED_KEY = "ownology_pwa_banner_dismissed";

export default function PwaInstallBanner() {
  const { canInstall, canInstallIos, promptInstall, isInstalled } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === "1") {
      setDismissed(true);
    }
  }, []);

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  async function handleInstall() {
    await promptInstall();
    handleDismiss();
  }

  if (isInstalled || dismissed) return null;
  if (!canInstall && !canInstallIos) return null;

  const isIos = !canInstall && canInstallIos;

  return (
    <div
      data-testid="pwa-install-banner"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-5 py-3"
      style={{
        background: "oklch(0.13 0.008 60)",
        borderTop: "1px solid oklch(0.72 0.12 75 / 25%)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Icon + text */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0"
          style={{ background: "oklch(0.72 0.12 75 / 15%)", border: "1px solid oklch(0.72 0.12 75 / 30%)" }}
        >
          {isIos ? (
            // iOS Share icon — the universal "tap this to install" cue
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M7 1.5v7M4.5 4 7 1.5 9.5 4" stroke="oklch(0.72 0.12 75)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 7v4.5A1.5 1.5 0 0 0 3.5 13h7A1.5 1.5 0 0 0 12 11.5V7" stroke="oklch(0.72 0.12 75)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M7 1v8M4 6l3 3 3-3" stroke="oklch(0.72 0.12 75)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 10v1.5A1.5 1.5 0 0 0 2.5 13h9A1.5 1.5 0 0 0 13 11.5V10" stroke="oklch(0.72 0.12 75)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <div>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 600, fontSize: "0.8125rem", color: "oklch(0.88 0.015 75)", lineHeight: 1.3 }}>
            {isIos ? "Install Ownology on your iPhone" : "Add Ownology to your home screen"}
          </p>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.75rem", color: "oklch(0.55 0.012 75)", lineHeight: 1.3 }}>
            {isIos
              ? "Tap the Share button below, then \u201CAdd to Home Screen\u201D"
              : "Works offline · Faster access · No app store needed"}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          data-testid="pwa-install-dismiss"
          onClick={handleDismiss}
          className="text-xs px-3 py-1.5 rounded-sm"
          style={{
            background: "transparent",
            border: "1px solid oklch(1 0 0 / 12%)",
            color: "oklch(0.50 0.010 75)",
            fontFamily: "'Lato', sans-serif",
            cursor: "pointer",
            minHeight: 36,
          }}
        >
          {isIos ? "Got it" : "Not now"}
        </button>
        {!isIos && (
          <button
            type="button"
            data-testid="pwa-install-accept"
            onClick={handleInstall}
            className="text-xs px-4 py-1.5 rounded-sm font-semibold"
            style={{
              background: "oklch(0.72 0.12 75)",
              color: "oklch(0.11 0.008 60)",
              fontFamily: "'Lato', sans-serif",
              cursor: "pointer",
              border: "none",
              minHeight: 36,
            }}
          >
            Install
          </button>
        )}
      </div>
    </div>
  );
}
