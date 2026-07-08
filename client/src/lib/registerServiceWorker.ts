/**
 * registerServiceWorker — installs /sw.js on the first page load.
 *
 * Guardrails:
 *  - No-ops in dev if VITE_ENABLE_SW !== "true" (default OFF for hot-reload
 *    friendliness — otherwise Vite HMR fights the cached shell).
 *  - No-ops in unsupported browsers (older iOS, edge cases).
 *  - Auto-refreshes the tab when a new SW takes control, so a deploy
 *    doesn't leave users staring at a stale bundle after Cmd+R.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isProd = import.meta.env.PROD;
  const forceOn = import.meta.env.VITE_ENABLE_SW === "true";
  if (!isProd && !forceOn) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        // SW registration failure is non-fatal — the app still works,
        // just without offline caching. Silent by design.
      });

    // When a new SW activates (deploy), reload once so the user gets
    // the fresh bundle without a hard-refresh.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
