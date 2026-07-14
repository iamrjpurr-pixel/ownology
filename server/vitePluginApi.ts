/**
 * Vite dev server plugin — proxies /api/trpc, /api/oauth, and /api/scheduled
 * to a small Express server running on a side port during development.
 * This mirrors the production setup where Express handles all /api/* routes.
 */
import type { Plugin, ViteDevServer } from "vite";
import express from "express";
import type { AddressInfo } from "net";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { parse as parseCookies } from "cookie";

// Same MEMBER_ONLY_PREFIXES list as production (server/index.ts). Keep in
// sync — this middleware only exists so preview UX matches production.
const MEMBER_ONLY_PREFIXES = [
  "/dashboard",
  "/cellar-brief",
  "/cellar-tasks",
  "/cellar-brief.pdf",
  "/cellar-journal",
  "/quick-entry",
  "/the-press",
  "/free-run/dashboard",
  "/batch-book",
  "/work-mode",
  "/cellar/",
  "/orders",
  "/todo",
  "/roadmap",
  "/import",
  "/copilot",
  "/copilot-mockup",
  "/site-map",
  "/campaign-metrics",
  "/build-index",
  "/vineyard",
  "/compliance",
  "/regulations",
  "/tank-qr",
  "/today",
  // Internal mockups + previews — gated so anonymous visitors see /try
  // honeypot, not an unfinished UX (Rich audit, Feb 2026). Team access
  // via gate-password unlock (ow_gate cookie) still works.
  "/branding-mockup",
  "/onboarding-mockup",
  "/cascade-demo",
  "/preview",
];

function pathIsMemberOnly(pathname: string): boolean {
  for (const p of MEMBER_ONLY_PREFIXES) {
    if (p.endsWith("/")) {
      if (pathname === p.slice(0, -1) || pathname.startsWith(p)) return true;
    } else {
      if (pathname === p || pathname.startsWith(p + "/")) return true;
    }
  }
  return false;
}

export function vitePluginApi(): Plugin {
  let apiPort: number | null = null;

  return {
    name: "manus-api",
    async configureServer(server: ViteDevServer) {
      // Dynamically import to avoid circular deps at plugin load time
      const { appRouter } = await import("./routers.js");
      const { createContext } = await import("./trpc.js");
      const { verifyGateCookie } = await import("./gate.js");
      const { COOKIE_NAME } = await import("../shared/const.js");
      const app = express();

      // ── Member wall for HTML routes (dev parity with production) ────────
      // Production wall lives in server/index.ts. In dev, Vite serves the
      // SPA directly and never touches Express — so we add the same wall
      // here so /import, /admin/quiz-picks etc. redirect anonymous visitors
      // to /try?from=<path> exactly like production does.
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        // Only intercept HTML SPA requests. Assets (JS/CSS/PNG) sail past.
        const accept = req.headers.accept || "";
        if (!accept.includes("text/html")) return next();
        // Strip query string for prefix check.
        const pathname = url.split("?")[0];
        if (!pathIsMemberOnly(pathname)) return next();

        const cookieHeader = req.headers.cookie || "";
        const cookies = parseCookies(cookieHeader);
        const hasSession = Boolean(cookies[COOKIE_NAME]);
        if (hasSession) return next();
        // verifyGateCookie expects an express-like Request but Vite's
        // ConnectMiddleware gives us the raw IncomingMessage. Cast is
        // safe because verifyGateCookie only reads headers.cookie.
        // @ts-expect-error narrow compat cast
        const hasGate = await verifyGateCookie(req);
        if (hasGate) return next();

        res.statusCode = 302;
        res.setHeader("Location", `/try?from=${encodeURIComponent(pathname)}`);
        res.end();
      });

      // tRPC middleware
      app.use(
        "/api/trpc",
        createExpressMiddleware({
          router: appRouter,
          createContext,
        })
      );

      const httpServer = createServer(app);
      await new Promise<void>((resolve) => {
        httpServer.listen(0, "127.0.0.1", () => {
          apiPort = (httpServer.address() as AddressInfo).port;
          console.log(`[api] Dev API server ready on port ${apiPort}`);
          resolve();
        });
      });

      // Proxy /api/trpc and /api/oauth to the Express side server
      server.middlewares.use(async (req, res, next) => {
        if (
          !req.url?.startsWith("/api/trpc") &&
          !req.url?.startsWith("/api/oauth") &&
          !req.url?.startsWith("/api/scheduled")
        ) {
          return next();
        }

        const { default: http } = await import("http");
        const proxyReq = http.request(
          {
            hostname: "127.0.0.1",
            port: apiPort!,
            path: req.url,
            method: req.method,
            headers: req.headers,
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode ?? 200, proxyRes.headers);
            proxyRes.pipe(res);
          }
        );

        proxyReq.on("error", (err) => {
          console.error("[api-proxy] Error:", err.message);
          res.writeHead(502);
          res.end("API proxy error");
        });

        req.pipe(proxyReq);
      });
    },
  };
}
