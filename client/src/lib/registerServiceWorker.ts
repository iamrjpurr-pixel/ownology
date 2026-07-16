/**
 * registerServiceWorker — installs /sw.js on the first page load.
 *
 * Guardrails:
 *  - No-ops in dev if VITE_ENABLE_SW !== "true" (default OFF for hot-reload
 *    friendliness — otherwise Vite HMR fights the cached shell).
 *  - No-ops in unsupported browsers (older iOS, edge cases).
 *  - Auto-refreshes the tab when a new SW takes control, so a deploy
 *    doesn't leave users staring at a stale bundle after Cmd+R.
 *  - Shows a "New version available" banner when a new SW is waiting
 *    (Feb 2026, Rich — "I opened the PWA and it looked like an old version").
 *    User taps → SW skipWaiting → controllerchange → auto-reload.
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
      .then((registration) => {
        // If there's already a waiting worker on load, surface the banner.
        if (registration.waiting) {
          showUpdateBanner(registration.waiting);
        }
        // Any subsequent update found (background poll) → banner.
        registration.addEventListener("updatefound", () => {
          const nw = registration.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              showUpdateBanner(nw);
            }
          });
        });
        // Poll every 30 min so long-lived tabs eventually see updates without
        // needing a hard reload. Cheap network probe.
        setInterval(() => {
          registration.update().catch(() => { /* offline — ignore */ });
        }, 30 * 60 * 1000);
      })
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

/** Renders a small "New version available — Refresh" banner top-right. */
function showUpdateBanner(sw: ServiceWorker): void {
  // Avoid stacking banners on repeated updatefound events.
  if (document.getElementById("ow-sw-update-banner")) return;
  const el = document.createElement("div");
  el.id = "ow-sw-update-banner";
  el.setAttribute("data-testid", "sw-update-banner");
  el.style.cssText = [
    "position:fixed",
    "top:16px",
    "right:16px",
    "z-index:9999",
    "background:var(--ow-bg-card,#1a1512)",
    "border:1px solid var(--ow-amber,#b8860b)",
    "color:var(--ow-text-hi,#faf6f0)",
    "font-family:'Lato',sans-serif",
    "font-size:0.85rem",
    "padding:0.65rem 0.9rem",
    "border-radius:6px",
    "box-shadow:0 8px 24px rgba(0,0,0,.35)",
    "display:flex",
    "align-items:center",
    "gap:0.6rem",
    "max-width:340px",
  ].join(";");
  el.innerHTML = `
    <span style="line-height:1.35">
      <strong style="color:var(--ow-amber,#b8860b);letter-spacing:0.06em;text-transform:uppercase;font-size:0.7rem;">New version</strong>
      <br/>Ownology has been updated. Refresh to get the latest.
    </span>
    <button data-testid="sw-update-refresh" style="background:var(--ow-amber,#b8860b);color:#1a1512;border:0;padding:0.4rem 0.75rem;border-radius:4px;font-weight:700;cursor:pointer;font-family:'Lato',sans-serif;font-size:0.8rem">Refresh</button>
    <button data-testid="sw-update-dismiss" aria-label="Dismiss" style="background:transparent;border:0;color:var(--ow-text-lo,#a8a29e);cursor:pointer;font-size:1.1rem;line-height:1;padding:0 0.15rem">×</button>
  `;
  document.body.appendChild(el);
  el.querySelector<HTMLButtonElement>('[data-testid="sw-update-refresh"]')
    ?.addEventListener("click", () => {
      sw.postMessage({ type: "SKIP_WAITING" });
      // controllerchange handler above will reload once activation completes.
    });
  el.querySelector<HTMLButtonElement>('[data-testid="sw-update-dismiss"]')
    ?.addEventListener("click", () => el.remove());
}
