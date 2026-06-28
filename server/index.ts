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

/**
 * HTTP Basic Auth gate for `/admin/*` pages and admin-only tRPC procedures.
 *
 * When `ADMIN_AUTH_USER` + `ADMIN_AUTH_PASS` env vars are BOTH set, the gate
 * is active — any request to an admin URL must include a matching Basic Auth
 * header. When either env var is missing (dev convenience), the gate is
 * disabled so curl + Playwright can still hit endpoints freely.
 *
 * Two URL classes are gated:
 *   1. SPA pages — /admin, /admin/* (frontend HTML routes)
 *   2. tRPC procs — /api/trpc/admin.* and /api/trpc/pricing.funnelStats
 *      (the backend admin routes — caught at the URL level so a leaked
 *       deep-link API URL can't be curled blind).
 *
 * Browser users see the standard browser auth prompt; curl users get a
 * 401 with WWW-Authenticate header (`-u user:pass` works).
 */
function adminBasicAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = process.env.ADMIN_AUTH_USER;
  const pass = process.env.ADMIN_AUTH_PASS;
  // Dev convenience: no credentials configured → gate is OFF.
  if (!user || !pass) return next();

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Ownology Admin"');
    return res.status(401).send("Authentication required.");
  }
  let decoded: string;
  try {
    decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
  } catch {
    res.setHeader("WWW-Authenticate", 'Basic realm="Ownology Admin"');
    return res.status(401).send("Authentication required.");
  }
  const idx = decoded.indexOf(":");
  const reqUser = idx >= 0 ? decoded.slice(0, idx) : "";
  const reqPass = idx >= 0 ? decoded.slice(idx + 1) : "";
  if (reqUser !== user || reqPass !== pass) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Ownology Admin"');
    return res.status(401).send("Authentication required.");
  }
  next();
}

/** Apply the admin gate selectively based on URL path. Kept as a single
 *  middleware so the route table stays clean. */
function adminGate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const p = req.path;
  const isAdminPage = p === "/admin" || p.startsWith("/admin/");
  const isAdminApi =
    p.startsWith("/api/trpc/admin.") || p.startsWith("/api/trpc/pricing.funnelStats");
  if (isAdminPage || isAdminApi) {
    return adminBasicAuth(req, res, next);
  }
  next();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Admin Basic-Auth gate (first middleware) ─────────────────────────────
  // Gates /admin/* SPA pages and /api/trpc/admin.* + /api/trpc/pricing.funnelStats
  // when ADMIN_AUTH_USER + ADMIN_AUTH_PASS are set in env. No-op otherwise.
  app.use(adminGate);

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
  server.listen(port, "0.0.0.0", () => {
    console.log(`[server] Running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
