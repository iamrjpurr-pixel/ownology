/**
 * viteGateWall — Vite dev-server plugin that mirrors the production
 * MEMBER_ONLY_PREFIXES wall in server/index.ts.
 *
 * Why this exists: in the Emergent dev preview, Vite serves the SPA
 * directly on port 3000 for all non-`/api/*` paths — so the Express
 * wall in server/index.ts never sees HTML page requests. Without this
 * plugin, /import, /admin/quiz-picks etc. would be reachable to anyone
 * on preview URLs even though production redirects them to /try.
 *
 * Keep the prefix list in sync with server/index.ts MEMBER_ONLY_PREFIXES.
 * Password verification is delegated to the shared /api/gate/verify
 * endpoint on Express, so this middleware only reads cookies — never
 * mints or compares passwords.
 */
import type { Plugin } from "vite";
import { parse as parseCookies } from "cookie";
import { jwtVerify } from "jose";
import "dotenv/config"; // Load /app/.env into process.env so we can read JWT_SECRET.

// Same names as production so cookies are cross-compatible with the
// Express wall in server/index.ts.
const APP_SESSION_COOKIE = "app_session_id";
const GATE_COOKIE = "ow_gate";

// Prefix list — keep in sync with server/index.ts MEMBER_ONLY_PREFIXES.
// Trailing slash means "prefix match, only this and below". No slash
// means "this path exactly OR anything under this/*".
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
  "/admin",
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

async function hasValidGateCookie(cookieHeader: string): Promise<boolean> {
  if (!cookieHeader) return false;
  const cookies = parseCookies(cookieHeader);
  const token = cookies[GATE_COOKIE];
  if (!token) return false;
  const secret = process.env.JWT_SECRET;
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload.gate === "ok";
  } catch {
    return false;
  }
}

export function viteGateWall(): Plugin {
  return {
    name: "ownology-gate-wall",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        // Only intercept HTML SPA navigation. Assets, /api/*, /@vite/*,
        // etc. should never trigger the wall.
        const accept = req.headers.accept || "";
        if (!accept.includes("text/html")) return next();
        // Vite serves /@vite/, /@fs/, /@id/, /node_modules/ etc.
        if (url.startsWith("/@") || url.startsWith("/api/") || url.startsWith("/node_modules/")) return next();

        const pathname = url.split("?")[0];
        if (!pathIsMemberOnly(pathname)) return next();

        const cookieHeader = req.headers.cookie || "";
        const cookies = parseCookies(cookieHeader);
        const hasSession = Boolean(cookies[APP_SESSION_COOKIE]);
        if (hasSession) return next();
        const hasGate = await hasValidGateCookie(cookieHeader);
        if (hasGate) return next();

        // Anonymous → redirect to /try honeypot with a hint we came from
        // a wall. Same shape as the production Express wall so client-side
        // logic (Try.tsx's ?from parsing) works identically.
        res.statusCode = 302;
        res.setHeader("Location", `/try?from=${encodeURIComponent(pathname)}`);
        res.end();
      });
    },
  };
}
