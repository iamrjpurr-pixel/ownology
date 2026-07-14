/**
 * Ownology Service Worker
 * ─────────────────────────
 * Minimal offline-first shell. Two caches:
 *
 *   1. STATIC — cache-first for the app shell (index.html, JS bundles,
 *      fonts, static images). Populated lazily as the app loads.
 *   2. RUNTIME — network-first for /api/* tRPC calls (so we always try
 *      fresh data first, but a cached response is served if the network
 *      is down — critical for cellar-floor use where the shed has 1 bar
 *      of signal at best).
 *
 * Cache-bust on version change: incrementing CACHE_VERSION forces old
 * caches to purge on the next activate, so a deploy doesn't leave users
 * on stale bundles.
 *
 * Public files (never cached): /manifest.json, /favicon.*, /robots.txt,
 * /sitemap.xml — small, always fresh from origin.
 */
const CACHE_VERSION = "ow-v19";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// URLs never to intercept — critical for OAuth callbacks, gate checks,
// LLM streaming responses (must never be served stale), and Stripe.
const BYPASS_PATHS = [
  "/api/auth/",
  "/api/oauth/",
  "/api/trpc/tutor.",       // streaming LLM answers
  "/api/trpc/voice.",       // whisper uploads
  "/api/trpc/gate.",
  "/api/stripe/",
  "/@vite/",
  "/@fs/",
  "/@id/",
  "/src/",
  "/node_modules/",
];

self.addEventListener("install", (event) => {
  // Skip waiting so a fresh SW takes over immediately on next reload.
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      // Pre-cache only the app shell entry — everything else is added on
      // demand by the fetch handler. Keeps first-install fast.
      cache.add("/").catch(() => {
        // If the shell can't be pre-cached (e.g. gate wall 302), that's
        // fine — runtime fetches will populate the cache later.
      })
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => !n.startsWith(CACHE_VERSION))
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never intercept cross-origin

  if (BYPASS_PATHS.some((p) => url.pathname.startsWith(p))) return;

  // API — network-first, fall back to cache if offline
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          // Only cache successful GETs
          if (fresh.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response(
            JSON.stringify({ error: "offline", cached: false }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        }
      })()
    );
    return;
  }

  // HTML navigation — network-first (so gate wall + auth redirects work),
  // fall back to cached shell.
  const isHtml =
    req.mode === "navigate" ||
    req.headers.get("accept")?.includes("text/html");
  if (isHtml) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          // Last-ditch: return the cached root shell
          const shell = await caches.match("/");
          if (shell) return shell;
          return new Response("Offline", { status: 503 });
        }
      })()
    );
    return;
  }

  // Static assets (JS/CSS/fonts/images) — cache-first with background
  // revalidate. Fast repeat loads; occasional refresh from network.
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res.ok) {
            caches.open(STATIC_CACHE).then((c) => c.put(req, res.clone()));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })()
  );
});
