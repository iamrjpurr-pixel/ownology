/**
 * viteGateWall — Vite dev-server plugin mirroring the production
 * default-deny gate wall in server/index.ts.
 *
 * Model (Feb 2026, flipped from opt-in to opt-out):
 *   - PUBLIC_EXACT + PUBLIC_PREFIXES = the ONLY paths anyone can hit
 *     without a session or gate cookie.
 *   - Everything else → redirect to /try?from=<original>.
 *
 * Why this dev plugin exists: in the Emergent dev preview, Vite serves
 * the SPA directly on port 3000 for all non-`/api/*` paths — so the
 * Express wall in server/index.ts never sees HTML page requests. Without
 * this plugin, gated pages would be reachable to anyone on preview URLs
 * even though production redirects them to /try.
 *
 * Keep PUBLIC_EXACT + PUBLIC_PREFIXES in sync with server/index.ts.
 * Password verification is delegated to the shared /api/gate/verify
 * endpoint on Express, so this middleware only reads cookies — never
 * mints or compares passwords.
 */
import type { Plugin } from "vite";
import { parse as parseCookies } from "cookie";
import { jwtVerify } from "jose";
import mysql from "mysql2/promise";
import "dotenv/config"; // Load /app/.env into process.env so we can read JWT_SECRET.

// Same names as production so cookies are cross-compatible with the
// Express wall in server/index.ts.
const APP_SESSION_COOKIE = "app_session_id";
const GATE_COOKIE = "ow_gate";

// ── Public allowlist — keep in sync with server/index.ts ─────────────────
// Anything NOT matched here needs a session or gate cookie.
const PUBLIC_EXACT = new Set<string>([
  "/",
  "/home",
  "/why-ownology",
  "/for-innovint-users",
  "/for-vintrace-users",
  "/for-home-winemakers",
  "/for-home-winemakers/troubleshooting",
  "/for-home-winemakers/glossary",
  "/for-home-winemakers/knowledge",
  "/blog",
  "/pricing",
  "/quiz",
  "/try",
  "/ask",
  "/founding-partners",
  "/referral",
  "/call-playbook",
  "/free-run",
  "/waitlist",
  "/demo",
  "/join",
  "/invite",
  "/login",
  "/auth/callback",
  "/onboarding",
  "/privacy",
  "/terms",
  "/refund",
  "/resources",
  "/resources/home-winery-kit",
  "/regulations/detail",
  "/merch",
  "/merch/success",
  "/merch/cancel",
  "/cellar-journal",
  "/branding-mockup",
  "/onboarding-mockup",
  "/cascade-demo",
  "/reference/vine",
  "/guide",
  "/resume",
  "/stats",
  "/founding-member/success",
  "/trial-ending",
  "/trial-locked",
  "/join/landscape",
  "/preview",
  "/404",
  "/risk-management",
  "/app", // redirects to /free-run
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
  "/manifest.json",
]);
const PUBLIC_PREFIXES = [
  "/api/", // tRPC + REST endpoints enforce own auth
  "/blog/",
  "/hi/",
  "/i/", // /i/:token — magic-link invites
  "/cellar-journal/",
  "/for-home-winemakers/knowledge/",
  "/reference/",
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  for (const p of PUBLIC_PREFIXES) {
    if (pathname.startsWith(p)) return true;
  }
  return false;
}

// Shared MySQL pool for the invite-revocation check. Kept small (1 conn)
// because the Vite dev server is single-process, low-traffic. Falls back
// to "not revoked" if the DB is unreachable — dev-preview usability wins
// over strict revocation on that failure mode.
let dbPool: mysql.Pool | null = null;
function getDbPool(): mysql.Pool | null {
  if (dbPool) return dbPool;
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  dbPool = mysql.createPool({ uri: url, connectionLimit: 1, connectTimeout: 3000 });
  return dbPool;
}

async function isInviteActive(inviteId: number): Promise<boolean> {
  const pool = getDbPool();
  if (!pool) return true; // Dev preview usability — never fail-closed on missing DB
  try {
    const [rows] = await pool.execute(
      "SELECT revoked_at, expires_at FROM gate_invites WHERE id = ? LIMIT 1",
      [inviteId]
    );
    const list = rows as Array<{ revoked_at: number | null; expires_at: number | null }>;
    const row = list[0];
    if (!row) return false;
    if (row.revoked_at) return false;
    if (row.expires_at && row.expires_at < Date.now()) return false;
    return true;
  } catch {
    return true; // DB blip — don't lock Rich out of dev preview
  }
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
    if (payload.gate === "ok") return true;
    if (payload.gate === "invite" && typeof payload.id === "number") {
      return await isInviteActive(payload.id);
    }
    return false;
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
        // Vite serves /@vite/, /@fs/, /@id/, /node_modules/ etc. Also skip
        // the internal HMR ping and any explicit dev endpoints.
        if (
          url.startsWith("/@") ||
          url.startsWith("/api/") ||
          url.startsWith("/node_modules/") ||
          url.startsWith("/src/") ||
          url.startsWith("/client/")
        ) {
          return next();
        }

        const pathname = url.split("?")[0];
        // Anything on the public allowlist → pass through untouched.
        if (isPublicPath(pathname)) return next();

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
