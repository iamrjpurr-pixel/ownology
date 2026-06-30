/**
 * usePwaInstall
 * ─────────────
 * Captures the browser's beforeinstallprompt event so the app can show
 * a custom "Add to Home Screen" prompt at the right moment.
 *
 * iOS detection (Feb 2026): iOS Safari NEVER fires beforeinstallprompt
 * even though the app IS installable via the Share Sheet → Add to Home
 * Screen flow. Without explicit detection, ~25% of cellar-floor traffic
 * (winemakers on iPhone) never see the install banner. We detect iOS
 * Safari directly and surface a Safari-specific instruction banner.
 *
 * Returns:
 *   - canInstall:    true when Chrome/Android has a deferred install prompt
 *   - canInstallIos: true when running in iOS Safari (manual install path)
 *   - promptInstall: shows the native install dialog (Chrome/Android only)
 *   - isInstalled:   true when running in standalone (already installed)
 */

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPad on iOS 13+ reports as Mac, but has touch points and no MSStream
  const isIPhone = /iPhone|iPod/.test(ua);
  const isIPad =
    /iPad/.test(ua) ||
    (navigator.platform === "MacIntel" && (navigator as { maxTouchPoints?: number }).maxTouchPoints !== undefined && (navigator as { maxTouchPoints: number }).maxTouchPoints > 1);
  if (!isIPhone && !isIPad) return false;
  // Filter out in-app browsers (FB, IG, Twitter) that can't install regardless
  const isInApp = /FBAN|FBAV|Instagram|Twitter|Line\//.test(ua);
  if (isInApp) return false;
  // CriOS = Chrome on iOS (also can't install); EdgiOS = Edge on iOS
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  if (isOtherIosBrowser) return false;
  return true;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [canInstallIos, setCanInstallIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    // iOS Safari path — direct UA detection, no install event fires.
    if (!standalone && detectIosSafari()) {
      setCanInstallIos(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  }

  return { canInstall, canInstallIos, promptInstall, isInstalled };
}
