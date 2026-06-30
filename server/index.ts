import "dotenv/config";
import "./_core/forgeShim.js";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "./routers.js";
import { createContext } from "./trpc.js";
import merchRouter from "./merch/api.js";
import { campaignMetricsHandler } from "./scheduled/campaignMetrics.js";
import { vintageRemindersHandler } from "./scheduled/vintageReminders.js";
import { regulationMonitorHandler } from "./scheduled/regulationMonitor.js";
import { fermentationWatchHandler } from "./scheduled/fermentationWatch.js";
import { trinityClusterHandler } from "./scheduled/trinityCluster.js";
import { trinityNewsletterHandler } from "./scheduled/trinityNewsletter.js";
import { cellarJournalSitemapHandler, robotsTxtHandler, cellarJournalRssHandler } from "./sitemap.js";
import { generateAuditTrailPdf } from "./auditTrailPdf.js";
import { dailyAlertEmailHandler } from "./scheduled/dailyAlertEmail.js";
import authRouter from "./authRouter.js";
import { jwtVerify } from "jose";
import { parse as parseCookies } from "cookie";
import { COOKIE_NAME } from "../shared/const.js";

/**
 * Admin gate (post-auth migration).
 *
 * Replaces the legacy HTTP Basic Auth wall with a JWT-role check that
 * inspects the `app_session_id` cookie set by /api/auth/exchange (Emergent
 * Google login). When the cookie verifies and the user's role is "admin",
 * the request proceeds. Otherwise:
 *
 *   - SPA admin pages (/admin, /admin/*) → 302 redirect to /login?next=<orig>
 *   - Admin tRPC endpoints + /api/exports/* → 401 JSON
 *
 * Legacy Basic Auth fallback: if ADMIN_AUTH_USER + ADMIN_AUTH_PASS are
 * both set, a matching Basic Auth header ALSO unlocks the gate. This keeps
 * any cron/CI scripts that were curling exports working without code
 * changes. Leave both env vars blank to require JWT login only.
 *
 * Dev convenience: when ENABLE_DEV_BYPASS=true (default in non-prod), the
 * gate is fully open — matches the existing tRPC dev-bypass behaviour so
 * the preview environment stays usable without configuring an account.
 */
async function verifyAdminCookie(req: express.Request): Promise<boolean> {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return false;
    const cookies = parseCookies(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (!token) return false;
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return false;
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return payload.role === "admin";
  } catch {
    return false;
  }
}

function checkBasicAuthFallback(req: express.Request): boolean {
  const user = process.env.ADMIN_AUTH_USER;
  const pass = process.env.ADMIN_AUTH_PASS;
  if (!user || !pass) return false;
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    const reqUser = idx >= 0 ? decoded.slice(0, idx) : "";
    const reqPass = idx >= 0 ? decoded.slice(idx + 1) : "";
    return reqUser === user && reqPass === pass;
  } catch {
    return false;
  }
}

function isDevBypassActive(): boolean {
  // Off only when explicitly set to "false" OR running in production. This
  // mirrors trpc.ts's seed-user injection so dev previews are wide open.
  if (process.env.ENABLE_DEV_BYPASS === "false") return false;
  if (process.env.NODE_ENV === "production" &&
      process.env.ENABLE_DEV_BYPASS !== "true") return false;
  return true;
}

async function adminGate(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const p = req.path;
  const isAdminPage = p === "/admin" || p.startsWith("/admin/");
  const isAdminApi =
    p.startsWith("/api/trpc/admin.") ||
    p.startsWith("/api/trpc/pricing.funnelStats") ||
    p.startsWith("/api/trpc/outreach.list") ||
    p.startsWith("/api/trpc/outreach.create") ||
    p.startsWith("/api/trpc/outreach.markSmsSent") ||
    p.startsWith("/api/trpc/outreach.markBooked") ||
    p.startsWith("/api/trpc/outreach.remove");
  const isExport = p.startsWith("/api/exports/");

  if (!isAdminPage && !isAdminApi && !isExport) return next();

  if (isDevBypassActive()) return next();
  if (checkBasicAuthFallback(req)) return next();
  if (await verifyAdminCookie(req)) return next();

  // SPA page → soft redirect to /login with returnPath. API → JSON 401.
  if (isAdminPage) {
    const nextPath = encodeURIComponent(req.originalUrl || p);
    return res.redirect(302, `/login?next=${nextPath}`);
  }
  return res.status(401).json({ error: "admin login required" });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Admin gate (JWT-role + Basic Auth fallback) ───────────────────────────
  // Verifies `app_session_id` JWT cookie (role=admin) on /admin/* pages and
  // admin-only tRPC endpoints. Legacy Basic Auth still unlocks via env if
  // set. Wide-open when ENABLE_DEV_BYPASS is active (default in non-prod).
  app.use(adminGate);

  // ── Auth API (Emergent Google OAuth exchange / me / logout) ───────────────
  // Mounted BEFORE express.json() because authRouter mounts its own
  // json() per-route to avoid clashing with /api/stripe/webhook raw body.
  app.use("/api/auth", authRouter);

  // ── Stripe webhook MUST come before express.json() ──────────────────────────
  app.use("/api/stripe/webhook", express.raw({ type: "application/json" }), (req, res, next) => {
    req.url = "/webhook";
    (merchRouter as express.Router)(req, res, next);
  });

  // ── Scheduled Heartbeat handler ──────────────────────────────────────────────
  app.post("/api/scheduled/campaign-metrics", express.json(), campaignMetricsHandler);
  app.post("/api/scheduled/vintage-reminders", express.json(), vintageRemindersHandler);
  app.post("/api/scheduled/regulation-monitor", express.json(), regulationMonitorHandler);
  app.post("/api/scheduled/fermentation-watch", express.json(), fermentationWatchHandler);
  app.post("/api/scheduled/trinity-cluster", express.json(), trinityClusterHandler);
  app.post("/api/scheduled/trinity-newsletter", express.json(), trinityNewsletterHandler);
  app.post("/api/scheduled/daily-alert-email", express.json(), dailyAlertEmailHandler);
  app.get("/api/scheduled/daily-alert-email", dailyAlertEmailHandler); // GET allowed for manual triggering / dry-run

  // ── SEO: sitemap + robots + RSS ──────────────────────────────────────────────
  app.get("/api/cellar-journal/sitemap.xml", cellarJournalSitemapHandler);
  app.get("/api/sitemap.xml", cellarJournalSitemapHandler);
  app.get("/api/cellar-journal/rss.xml", cellarJournalRssHandler);
  app.get("/api/robots.txt", robotsTxtHandler);

  // ── Compliance audit trail PDF (regulator-ready export) ─────────────────────
  app.get("/api/compliance/audit-trail.pdf", generateAuditTrailPdf);

  // ── SOP Library export (Markdown + PDF) — owner-only ────────────────────────
  // Run `node scripts/export-sops.mjs` to regenerate. These endpoints serve
  // the most recent generated copy. Behind adminGate so only you can grab it.
  app.get("/api/exports/sops.md", (_req, res) => {
    res.sendFile(path.resolve(__dirname, "..", "exports", `sops-library-${new Date().toISOString().slice(0, 10)}.md`), (err) => {
      if (err) res.status(404).send("Run `node scripts/export-sops.mjs` first.");
    });
  });
  app.get("/api/exports/sops.pdf", (_req, res) => {
    res.sendFile(path.resolve(__dirname, "..", "exports", `sops-library-${new Date().toISOString().slice(0, 10)}.pdf`), (err) => {
      if (err) res.status(404).send("Run `node scripts/export-sops.mjs` first.");
    });
  });

  // ── Clean URL alias for the sample vintage log demo ─────────────────────────
  // The static asset lives at /sample-vintage-log.html. This alias serves the
  // same file at /sample-vintage-log (no extension) for prettier marketing
  // links. Query params (?variant=hunter|boutique|large&from=sms-<slug>) are
  // passed through unchanged. The .html URL keeps working — both routes are
  // valid entry points.
  app.get("/sample-vintage-log", (_req, res) => {
    res.sendFile(path.resolve(__dirname, "..", "client", "public", "sample-vintage-log.html"), (err) => {
      if (err) res.status(404).send("sample-vintage-log.html not found in client/public");
    });
  });

  // ── JSON body parser ─────────────────────────────────────────────────────────
  app.use(express.json());

  // ── Merch API ────────────────────────────────────────────────────────────────
  app.use("/api/merch", merchRouter);

  // ── tRPC API ─────────────────────────────────────────────────────────────────
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ── Static files ─────────────────────────────────────────────────────────────
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Client-side routing fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = Number(process.env.PORT) || 8001;
  // Bootstrap: ensure runtime-only telemetry tables exist (no migration needed).
  // theme_suggestions tracks acceptance of the once-a-day suggestion banner.
  try {
    const { db } = await import("./db.js");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS theme_suggestions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        suggested_theme_id VARCHAR(32) NOT NULL,
        session_id VARCHAR(64) NOT NULL,
        hour_local INT NOT NULL,
        is_harvest_month BOOLEAN NOT NULL DEFAULT FALSE,
        action ENUM('accepted','dismissed','opted_out') NOT NULL,
        logged_at BIGINT NOT NULL,
        INDEX ts_theme_idx (suggested_theme_id),
        INDEX ts_hour_idx (hour_local),
        INDEX ts_logged_at_idx (logged_at)
      )
    `);
  } catch (e) {
    console.warn("[bootstrap] theme_suggestions table create skipped:", (e as Error).message);
  }
  server.listen(port, "0.0.0.0", () => {
    console.log(`[server] Running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
