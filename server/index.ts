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
import { cellarJournalSitemapHandler, mainSitemapHandler, robotsTxtHandler, cellarJournalRssHandler } from "./sitemap.js";
import { generateAuditTrailPdf } from "./auditTrailPdf.js";
import { dailyAlertEmailHandler } from "./scheduled/dailyAlertEmail.js";
import { marketingCoachEmailHandler } from "./scheduled/marketingCoachEmail.js";
import { nurtureEmailHandler } from "./scheduled/nurtureEmail.js";
import { generateLipAuditPackPdf } from "./lipAuditPackPdf.js";
import { isRuntimeBypassActive } from "./devBypassRuntime.js";
import { publicAuditHandler } from "./publicAudit.js";
import authRouter from "./authRouter.js";
import {
  verifyGateCookie,
  verifyGateCookieDetailed,
  isTrialAllowedPath,
  mintGateToken,
  mintInviteToken,
  setGateCookie,
  clearGateCookie,
  checkGateRateLimit,
  recordGateAttempt,
  clientIpOf,
  isIpAllowlisted,
  rateLimitCheck,
} from "./gate.js";
import { jwtVerify } from "jose";
import { parse as parseCookies } from "cookie";
import { COOKIE_NAME } from "../shared/const.js";

/** HTML-attribute-safe escape for injected meta content. Handles the
 *  characters that would break out of a `content="..."` attribute or the
 *  `<title>` element. Kept alongside the meta-injection middleware. */
function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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
  // Runtime override wins first (admin toggled via /admin/dev-mode). Falls
  // through to env-var evaluation if the runtime flag is off.
  if (isRuntimeBypassActive()) return true;
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
    p.startsWith("/api/trpc/outreach.remove") ||
    p.startsWith("/api/admin/");
  const isExport = p.startsWith("/api/exports/");

  if (!isAdminPage && !isAdminApi && !isExport) return next();

  if (isDevBypassActive()) return next();
  if (isIpAllowlisted(clientIpOf(req))) return next();
  if (checkBasicAuthFallback(req)) return next();
  if (await verifyAdminCookie(req)) return next();
  // Shared-secret password wall (Feb 2026): if the team member unlocked
  // via /api/gate/verify, treat that as sufficient to view admin pages
  // and call admin APIs. Not a substitute for the P0 tRPC auth-scope
  // audit — the wall is a UX fence, not per-user authorisation.
  if (await verifyGateCookie(req)) return next();

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

  // ── Health probe (MUST be registered before adminGate/routers) ───────────
  // k8s readiness/liveness probes hit /api/health, /healthz, or /health.
  // Returns 200 immediately without touching the DB so a slow Railway MySQL
  // cold-start can't kill the pod during boot. Emergent's default backend
  // contract expects GET /health returning status < 500.
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  });
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  });
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  });

  // ── Deep health probe (O2) — checks downstream dependencies. Runs a
  // quick timeout-bounded ping on each integration and returns per-
  // service status. Use for post-deploy smoke tests and alerting.
  app.get("/api/health/deep", async (_req, res) => {
    const results: Record<string, { ok: boolean; ms?: number; error?: string }> = {};
    async function timed<T>(name: string, fn: () => Promise<T>): Promise<void> {
      const start = Date.now();
      try {
        await Promise.race([
          fn(),
          new Promise((_r, rej) => setTimeout(() => rej(new Error("timeout")), 3000)),
        ]);
        results[name] = { ok: true, ms: Date.now() - start };
      } catch (e) {
        results[name] = { ok: false, ms: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
      }
    }
    await timed("mysql", async () => {
      const { db } = await import("./db.js");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`SELECT 1`);
    });
    await timed("perplexity_key", async () => {
      if (!process.env.PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY missing");
    });
    await timed("resend_key", async () => {
      if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
    });
    await timed("emergent_llm_key", async () => {
      if (!process.env.EMERGENT_LLM_KEY) throw new Error("EMERGENT_LLM_KEY missing");
    });
    await timed("gate_password", async () => {
      if (!process.env.OWNOLOGY_GATE_PASSWORD) throw new Error("OWNOLOGY_GATE_PASSWORD missing");
    });
    const allOk = Object.values(results).every((r) => r.ok);
    res.status(allOk ? 200 : 503).json({ ok: allOk, services: results });
  });

  // ── tRPC + scheduled rate limits (S2) ────────────────────────────────
  // Blanket per-IP throttling to protect the Perplexity + Resend budgets
  // and the Emergent LLM key from bot loops. Health probes are exempt so
  // k8s liveness never gets rate-limited.
  app.use("/api/trpc", (req, res, next) => {
    const ip = clientIpOf(req);
    const r = rateLimitCheck("trpc", ip, 60_000, 100); // 100 req/min per IP
    if (!r.allowed) {
      res.setHeader("Retry-After", String(Math.ceil((r.retryAfterMs ?? 0) / 1000)));
      return res.status(429).json({ error: "rate limited" });
    }
    next();
  });
  app.use("/api/scheduled", (req, res, next) => {
    const ip = clientIpOf(req);
    const r = rateLimitCheck("scheduled", ip, 60_000, 20); // 20 req/min per IP
    if (!r.allowed) {
      res.setHeader("Retry-After", String(Math.ceil((r.retryAfterMs ?? 0) / 1000)));
      return res.status(429).json({ error: "rate limited" });
    }
    next();
  });

  // ── Admin gate (JWT-role + Basic Auth fallback) ───────────────────────────
  // Verifies `app_session_id` JWT cookie (role=admin) on /admin/* pages and
  // admin-only tRPC endpoints. Legacy Basic Auth still unlocks via env if
  // set. Wide-open when ENABLE_DEV_BYPASS is active (default in non-prod).
  app.use(adminGate);

  // ── Auth API (Emergent Google OAuth exchange / me / logout) ───────────────
  // Mounted BEFORE express.json() because authRouter mounts its own
  // json() per-route to avoid clashing with /api/stripe/webhook raw body.
  app.use("/api/auth", authRouter);

  // ── Gate API (shared-secret password wall) ────────────────────────────────
  // POST /api/gate/verify {password} → sets `ow_gate` cookie on match.
  // GET  /api/gate/status              → { unlocked: boolean } for the UI.
  // POST /api/gate/logout              → clears the cookie.
  // Rate-limited to 5 attempts / 15 min per IP. Password source of truth
  // is env var OWNOLOGY_GATE_PASSWORD — leave blank to disable the wall
  // entirely (existing app_session_id cookie is still respected).
  app.post("/api/gate/verify", express.json(), async (req, res) => {
    const ip = clientIpOf(req);
    const ua = String(req.headers["user-agent"] || "").slice(0, 300);
    const rate = checkGateRateLimit(ip);
    if (!rate.allowed) {
      // Log the rate-limit event (S3) — best-effort; never let logging
      // failures affect the client response.
      import("./db.js").then(async ({ db }) => {
        const { sql } = await import("drizzle-orm");
        await db.execute(sql`INSERT INTO gate_events (kind, ip, user_agent, path, occurred_at) VALUES ('rate_limited', ${ip}, ${ua}, '/api/gate/verify', ${Date.now()})`);
      }).catch(() => {});
      res.setHeader("Retry-After", String(Math.ceil((rate.retryAfterMs ?? 0) / 1000)));
      return res.status(429).json({ ok: false, error: "Too many attempts. Try again in 15 minutes." });
    }
    recordGateAttempt(ip);

    const expected = process.env.OWNOLOGY_GATE_PASSWORD;
    if (!expected) {
      return res.status(503).json({ ok: false, error: "Gate not configured. Ask the operator to set OWNOLOGY_GATE_PASSWORD." });
    }
    const body = req.body as { password?: unknown } | undefined;
    const candidate = typeof body?.password === "string" ? body.password : "";
    if (!candidate || candidate !== expected) {
      import("./db.js").then(async ({ db }) => {
        const { sql } = await import("drizzle-orm");
        await db.execute(sql`INSERT INTO gate_events (kind, ip, user_agent, path, occurred_at) VALUES ('fail', ${ip}, ${ua}, '/api/gate/verify', ${Date.now()})`);
      }).catch(() => {});
      return res.status(401).json({ ok: false, error: "Wrong password." });
    }
    const token = await mintGateToken();
    if (!token) {
      return res.status(503).json({ ok: false, error: "Gate not configured (JWT_SECRET missing)." });
    }
    setGateCookie(res, token);
    import("./db.js").then(async ({ db }) => {
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`INSERT INTO gate_events (kind, ip, user_agent, path, occurred_at) VALUES ('success', ${ip}, ${ua}, '/api/gate/verify', ${Date.now()})`);
    }).catch(() => {});
    return res.json({ ok: true });
  });
  app.get("/api/gate/status", async (req, res) => {
    const unlocked = await verifyGateCookie(req);
    return res.json({ unlocked });
  });
  app.post("/api/gate/logout", (_req, res) => {
    clearGateCookie(res);
    return res.json({ ok: true });
  });

  // ── Invite magic-link endpoint ─────────────────────────────────────────
  // GET /i/:token — anyone with a valid, un-revoked, un-expired invite
  // token gets an ow_gate cookie scoped to that invite and lands on /admin.
  // Uses same rate-limiter bucket as password verify so a scattergun
  // attack against random tokens hits the same wall (5 attempts / 15 min
  // per IP).
  app.get("/i/:token", async (req, res) => {
    const ip = clientIpOf(req);
    const ua = String(req.headers["user-agent"] || "").slice(0, 300);
    const rl = checkGateRateLimit(ip);
    if (!rl.allowed) {
      import("./db.js").then(async ({ db }) => {
        const { sql } = await import("drizzle-orm");
        await db.execute(sql`INSERT INTO gate_events (kind, ip, user_agent, path, occurred_at) VALUES ('rate_limited', ${ip}, ${ua}, '/i/*', ${Date.now()})`);
      }).catch(() => {});
      return res.status(429).send("Too many attempts. Try again in a few minutes.");
    }

    const token = String(req.params.token || "").trim();
    if (!token || token.length < 20 || token.length > 48) {
      recordGateAttempt(ip);
      return res.status(400).send("Invalid invite link.");
    }

    const { db } = await import("./db.js");
    const { sql, eq } = await import("drizzle-orm");
    const { gateInvites } = await import("../drizzle/schema.js");
    const rows = await db
      .select()
      .from(gateInvites)
      .where(eq(gateInvites.token, token))
      .limit(1);
    const invite = rows[0];
    if (!invite) {
      recordGateAttempt(ip);
      await db.execute(sql`INSERT INTO gate_events (kind, ip, user_agent, path, occurred_at) VALUES ('fail', ${ip}, ${ua}, '/i/token-not-found', ${Date.now()})`).catch(() => {});
      return res.status(404).send("Invite link not found or already revoked.");
    }
    if (invite.revokedAt) {
      await db.execute(sql`INSERT INTO gate_events (kind, ip, user_agent, path, occurred_at) VALUES ('fail', ${ip}, ${ua}, ${'/i/revoked/' + String(invite.id)}, ${Date.now()})`).catch(() => {});
      return res.status(403).send("This invite has been revoked. Please ask for a fresh link.");
    }
    if (invite.expiresAt && invite.expiresAt < Date.now()) {
      return res.status(403).send("This invite has expired. Please ask for a fresh link.");
    }

    const cookieToken = await mintInviteToken(invite.id);
    if (!cookieToken) return res.status(503).send("Gate not configured. Ask the operator.");
    setGateCookie(res, cookieToken);
    // Update usage counters (fire-and-forget)
    const now = Date.now();
    db.update(gateInvites)
      .set({
        firstUsedAt: invite.firstUsedAt ?? now,
        lastUsedAt: now,
        useCount: (invite.useCount ?? 0) + 1,
      })
      .where(eq(gateInvites.id, invite.id))
      .catch(() => {});
    await db.execute(sql`INSERT INTO gate_events (kind, ip, user_agent, path, occurred_at) VALUES ('success', ${ip}, ${ua}, ${'/i/invite/' + String(invite.id)}, ${Date.now()})`).catch(() => {});
    // Land on the admin hub — most invites are for team/beta testers.
    return res.redirect(302, "/admin");
  });

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
  app.post("/api/scheduled/marketing-coach-email", express.json(), marketingCoachEmailHandler);
  app.get("/api/scheduled/marketing-coach-email", marketingCoachEmailHandler); // GET allowed for manual triggering / dry-run
  app.post("/api/scheduled/nurture-email", express.json(), nurtureEmailHandler);
  app.get("/api/scheduled/nurture-email", nurtureEmailHandler); // GET allowed for dry-run inspection

  // ── SEO: sitemap + robots + RSS ──────────────────────────────────────────────
  app.get("/api/cellar-journal/sitemap.xml", cellarJournalSitemapHandler);
  app.get("/api/sitemap.xml", mainSitemapHandler);
  app.get("/api/cellar-journal/rss.xml", cellarJournalRssHandler);
  app.get("/api/robots.txt", robotsTxtHandler);

  // ── Compliance audit trail PDF (regulator-ready export) ─────────────────────
  app.get("/api/compliance/audit-trail.pdf", generateAuditTrailPdf);
  // LIP audit pack PDF — regulator-ready export. Gated (O3): only
  // Google-authenticated users OR password-unlocked visitors can download.
  // Anonymous requests get bounced to /try like other member pages.
  app.get("/api/compliance/lip-audit-pack.pdf", async (req, res, next) => {
    const cookieHeader = req.headers.cookie || "";
    const cookies = parseCookies(cookieHeader);
    if (cookies[COOKIE_NAME]) return generateLipAuditPackPdf(req, res);
    if (isIpAllowlisted(clientIpOf(req))) return generateLipAuditPackPdf(req, res);
    if (await verifyGateCookie(req)) return generateLipAuditPackPdf(req, res);
    return res.status(401).json({ error: "auth required — unlock via /try or login" });
  });

  // ── Public, opt-in vanity audit page (per-winery /audit/:slug) ──────────────
  // Privacy-first: 404 unless the winery has toggled publicAuditEnabled=true
  // on /admin/settings. No operator names, no reasoning, no notes — only
  // regulator-relevant structured event fields. Rate-limited per IP.
  app.get("/audit/:slug", publicAuditHandler);

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
  // 40MB limit — sits comfortably above 25MB raw audio's base64 footprint
  // (~33.4MB) so the friendly "Audio exceeds 25MB Whisper limit" error from
  // vintageLog.parseFromVoice actually fires instead of Express's default
  // HTML 413 error page. Also covers camera image imports which use the same
  // base64-in-JSON pattern.
  app.use(express.json({ limit: "40mb" }));

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

  // ── Default-DENY gate wall ────────────────────────────────────────────
  // Feb 2026 — flipped from opt-in (MEMBER_ONLY_PREFIXES) to opt-out
  // (PUBLIC_PATHS + PUBLIC_PREFIXES). Rationale: the previous model was
  // fail-open — any new page not added to the block-list was publicly
  // reachable. This model is fail-closed — any new page is gated by
  // default and must be explicitly added to the allowlist to be public.
  //
  // Static assets (JS/CSS/images) already bypass this via the
  // `text/html` accept-header check inside the handler.
  //
  // /api/* is deliberately public here because tRPC/REST endpoints
  // enforce their own auth at the procedure level (ownerProcedure,
  // wineryProcedure) — we don't want to double-gate them at the URL
  // layer or the OAuth callback flow would break.
  //
  // Redirect target: /try honeypot, matching the old behaviour.
  const PUBLIC_EXACT = new Set<string>([
    "/",
    "/home",
    "/why-ownology",
    // Competitor-migration pages (`/for-innovint-users`, `/for-vintrace-users`)
    // are deliberately NOT in PUBLIC_EXACT. They stay routable for warm-outreach
    // links (invite-token / /hi/:slug) but a public crawler hits the gate wall
    // instead — keeps us out of trademark/tortious-interference territory.
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
    "/join/qr",
    "/install-ios",
    "/pwa/install",
    "/pwa/ios",
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
    "/api/", // tRPC + REST endpoints enforce own auth at the procedure layer
    "/blog/", // /blog/:slug
    "/hi/", // /hi/:slug + /hi/producers/:id
    "/i/", // /i/:token — magic-link invites (see server/routers/gate.ts)
    "/cellar-journal/", // /cellar-journal/:slug
    "/for-home-winemakers/knowledge/", // /for-home-winemakers/knowledge/:section
    "/reference/", // future /reference/* pages
  ];
  const isPublicPath = (pathname: string): boolean => {
    if (PUBLIC_EXACT.has(pathname)) return true;
    for (const p of PUBLIC_PREFIXES) {
      if (pathname.startsWith(p)) return true;
    }
    return false;
  };
  app.get("*", async (req, res, next) => {
    // Only intercept HTML SPA requests. Assets (JS/CSS/PNG) served by
    // express.static above never carry `text/html` in Accept.
    const accept = req.headers.accept || "";
    if (!accept.includes("text/html")) return next();

    // Anything explicitly public → pass through.
    if (isPublicPath(req.path)) return next();

    // ─── Dev-only routes ────────────────────────────────────────────────
    // /todo and /roadmap are the internal working roadmap — deliberately
    // NOT for production. Return 404 on any live ownology.ai hostname so
    // curious visitors can't discover our security backlog. Still works
    // on preview/dev hosts (they'll flow through to the gate check).
    const DEV_ONLY_PATHS = new Set(["/todo", "/roadmap"]);
    const PROD_HOSTS = new Set(["ownology.ai", "www.ownology.ai"]);
    if (DEV_ONLY_PATHS.has(req.path) && PROD_HOSTS.has(req.hostname)) {
      return res.status(404).send("Not Found");
    }

    // Two paths through the wall:
    //   1. Google-authenticated user (has app_session_id cookie set by
    //      /api/auth/exchange) — the real, per-user route.
    //   2. Shared-secret password unlock (has ow_gate cookie set by
    //      /api/gate/verify) — the pragmatic bridge for team members
    //      and trusted testers before we ship full auth.
    // Either grants entry. Missing both → redirect to /try honeypot.
    const cookieHeader = req.headers.cookie || "";
    const cookies = parseCookies(cookieHeader);
    const hasSession = Boolean(cookies[COOKIE_NAME]);
    if (hasSession) return next();
    if (isIpAllowlisted(clientIpOf(req))) return next();
    // Progressive-exposure check: a trial-tier cookie only unlocks
    // TRIAL_ALLOWED_PREFIXES. Any other route returns them to /trial-locked
    // with a "here's what's included / here's how to upgrade" landing.
    const gateDetail = await verifyGateCookieDetailed(req);
    if (gateDetail) {
      if (gateDetail.tier === "trial" && !isTrialAllowedPath(req.path)) {
        return res.redirect(302, `/trial-locked?from=${encodeURIComponent(req.path)}`);
      }
      return next();
    }
    // Anonymous → send to sandbox with a hint we came from a wall
    res.redirect(302, `/try?from=${encodeURIComponent(req.path)}`);
  });

  // ── Per-route meta injection for social share cards ────────────────────
  // The SPA ships a single index.html with generic OG tags for `/`. But
  // WhatsApp/Twitter/Slack/LinkedIn crawlers ONLY read the raw HTML they
  // fetch — they don't run JS. So updating meta tags client-side does
  // nothing for previews. The fix is server-side: intercept the HTML
  // request for specific routes, read index.html from disk, string-swap
  // the OG block, and serve.
  //
  // Kept as a static map keyed by pathname so adding new share cards is a
  // one-line change. `image` must be an absolute-from-root URL under
  // /client/public/.
  //
  // In dev this middleware never fires (Vite serves /try on :3000 directly).
  // Social crawlers only crawl production, so that's the correct scope.
  const ROUTE_META: Record<
    string,
    { title: string; description: string; image: string; canonicalPath: string }
  > = {
    "/try": {
      title: "Try Ownology — Run a winery for 10 minutes",
      description:
        "A guided sandbox with real 12-batch cellar data from Ownology Cellars. Fix a stuck ferment. Log the action. Publish the lesson. No signup, no credit card, no writes to anyone's data.",
      image: "https://ownology.ai/og-try.png",
      canonicalPath: "/try",
    },
    "/ask": {
      title: "Ask Ownology — free winemaking answers, cited from the bibles",
      description: "Any winemaking question, answered by Owen from industry-standard oenology references. Free, no signup, and every answer becomes a permanent Cellar Journal entry.",
      image: "https://ownology.ai/og-try.png",
      canonicalPath: "/ask",
    },
    "/founding-partners": {
      title: "Ownology — For our founding partners.",
      description:
        "Vintage 2026 is fermenting across Australia and New Zealand right now. YAN calls, MLF timing, stuck tanks — every decision in the next 90 days shapes this vintage. We're onboarding a small circle of founding partners to shape the platform through their live 2026 ferment — and every vintage after.",
      image: "https://ownology.ai/og-try.png",
      canonicalPath: "/join",
    },
    "/join": {
      title: "Ownology — For our founding partners.",
      description:
        "Vintage 2026 is fermenting across Australia and New Zealand right now. YAN calls, MLF timing, stuck tanks — every decision in the next 90 days shapes this vintage. We're onboarding a small circle of founding partners to shape the platform through their live 2026 ferment — and every vintage after.",
      image: "https://ownology.ai/og-try.png",
      canonicalPath: "/join",
    },
  };

  app.get(Object.keys(ROUTE_META), async (req, res, next) => {
    try {
      const meta = ROUTE_META[req.path];
      if (!meta) return next();
      const fs = await import("fs/promises");
      const raw = await fs.readFile(path.join(staticPath, "index.html"), "utf8");
      const canonical = `https://ownology.ai${meta.canonicalPath}`;
      // Swap the whole <title> and the OG/Twitter meta blocks. We match on
      // the exact strings that ship in index.html so this stays deterministic;
      // if that file changes shape, the swaps become no-ops and the page
      // still serves — just with the default OG card.
      const html = raw
        .replace(
          /<title>[^<]*<\/title>/,
          `<title>${escapeHtmlAttr(meta.title)}</title>`
        )
        .replace(
          /<meta name="description" content="[^"]*"\s*\/?>/,
          `<meta name="description" content="${escapeHtmlAttr(meta.description)}" />`
        )
        .replace(
          /<meta property="og:title" content="[^"]*"\s*\/?>/,
          `<meta property="og:title" content="${escapeHtmlAttr(meta.title)}" />`
        )
        .replace(
          /<meta property="og:description" content="[^"]*"\s*\/?>/,
          `<meta property="og:description" content="${escapeHtmlAttr(meta.description)}" />`
        )
        .replace(
          /<meta property="og:url" content="[^"]*"\s*\/?>/,
          `<meta property="og:url" content="${canonical}" />`
        )
        .replace(
          /<meta property="og:image" content="[^"]*"\s*\/?>/,
          `<meta property="og:image" content="${meta.image}" />`
        )
        .replace(
          /<meta property="og:image:alt" content="[^"]*"\s*\/?>/,
          `<meta property="og:image:alt" content="${escapeHtmlAttr(meta.title)}" />`
        )
        .replace(
          /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
          `<meta name="twitter:title" content="${escapeHtmlAttr(meta.title)}" />`
        )
        .replace(
          /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
          `<meta name="twitter:description" content="${escapeHtmlAttr(meta.description)}" />`
        )
        .replace(
          /<meta name="twitter:image" content="[^"]*"\s*\/?>/,
          `<meta name="twitter:image" content="${meta.image}" />`
        )
        .replace(
          /<link rel="canonical" href="[^"]*"\s*\/?>/,
          `<link rel="canonical" href="${canonical}" />`
        );
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.send(html);
    } catch (err) {
      // If disk read fails, fall through to the SPA fallback below.
      next(err);
    }
  });

  // ── Dynamic OG for /cellar-journal/:slug ────────────────────────────────
  // Every Cellar Journal permalink gets its own shareable card: the actual
  // winemaker question in the title, Owen's diagnosis in the description.
  // This is what makes Ask Owen answers viral — someone pastes the link
  // into a group chat / LinkedIn / Reddit and the preview reads like a
  // real Q&A, not a generic marketing card.
  app.get("/cellar-journal/:slug", async (req, res, next) => {
    try {
      const slug = req.params.slug;
      if (!slug || slug === "sitemap.xml" || slug === "rss.xml") return next();
      const { db } = await import("./db.js");
      const schemaMod = await import("../drizzle/schema.js");
      const { eq, and } = await import("drizzle-orm");
      const rows = await db
        .select({
          question: schemaMod.cellarJournal.question,
          diagnosis: schemaMod.cellarJournal.diagnosis,
          topicTag: schemaMod.cellarJournal.topicTag,
        })
        .from(schemaMod.cellarJournal)
        .where(
          and(
            eq(schemaMod.cellarJournal.slug, slug),
            eq(schemaMod.cellarJournal.published, true)
          )
        )
        .limit(1);
      const row = rows[0];
      if (!row) return next(); // 404 → SPA fallback → NotFound

      const fs = await import("fs/promises");
      const raw = await fs.readFile(path.join(staticPath, "index.html"), "utf8");
      const canonical = `https://ownology.ai/cellar-journal/${encodeURIComponent(slug)}`;

      // Trim to safe OG lengths — LinkedIn cuts at ~200 chars for description.
      const question = String(row.question ?? "").slice(0, 100);
      const rawDiag = String(row.diagnosis ?? "").replace(/\s+/g, " ").trim();
      const diagnosis = rawDiag.length > 180 ? rawDiag.slice(0, 177) + "…" : rawDiag;
      const topic = row.topicTag ? ` · ${row.topicTag}` : "";
      const title = `${question} — Owen answers${topic}`;
      const description = diagnosis || "Winemaker Q&A answered by Owen, grounded in industry-standard oenology references. Free, no signup.";
      const image = "https://ownology.ai/og-try.png";

      const html = raw
        .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtmlAttr(title)}</title>`)
        .replace(
          /<meta name="description" content="[^"]*"\s*\/?>/,
          `<meta name="description" content="${escapeHtmlAttr(description)}" />`
        )
        .replace(
          /<meta property="og:type" content="[^"]*"\s*\/?>/,
          `<meta property="og:type" content="article" />`
        )
        .replace(
          /<meta property="og:title" content="[^"]*"\s*\/?>/,
          `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`
        )
        .replace(
          /<meta property="og:description" content="[^"]*"\s*\/?>/,
          `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`
        )
        .replace(
          /<meta property="og:url" content="[^"]*"\s*\/?>/,
          `<meta property="og:url" content="${canonical}" />`
        )
        .replace(
          /<meta property="og:image" content="[^"]*"\s*\/?>/,
          `<meta property="og:image" content="${image}" />`
        )
        .replace(
          /<meta property="og:image:alt" content="[^"]*"\s*\/?>/,
          `<meta property="og:image:alt" content="${escapeHtmlAttr(question)}" />`
        )
        .replace(
          /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
          `<meta name="twitter:title" content="${escapeHtmlAttr(title)}" />`
        )
        .replace(
          /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
          `<meta name="twitter:description" content="${escapeHtmlAttr(description)}" />`
        )
        .replace(
          /<meta name="twitter:image" content="[^"]*"\s*\/?>/,
          `<meta name="twitter:image" content="${image}" />`
        )
        .replace(
          /<link rel="canonical" href="[^"]*"\s*\/?>/,
          `<link rel="canonical" href="${canonical}" />`
        );
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.send(html);
    } catch (err) {
      return next(err);
    }
  });

  // API 404 JSON — any /api/* path not matched by a real route above should
  // return 404 JSON, NOT the SPA HTML index. Registered AFTER all real /api
  // routers so it only catches unmatched paths. Prevents warm-list-clicked
  // links to old/renamed endpoints from silently serving the SPA.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "not_found", message: "API endpoint not found" });
  });

  // Client-side routing fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = Number(process.env.PORT) || 8001;
  // Emergent's k8s ingress splits requests between two ports: /api/* → :8001
  // (backend), everything else → :3000 (frontend). This monolithic Express
  // app serves BOTH from the same handler tree, so we bind on both ports and
  // the same routes handle whichever the ingress forwards. The FRONTEND_PORT
  // listener is what unblocks the k8s readiness probe on non-8001 pods.
  const frontendPort = Number(process.env.FRONTEND_PORT) || 3000;

  // ── Start listening FIRST — before the (slow) bootstrap DB queries ─────
  // Original bug: bootstrap ran ~10-30s of sequential Railway MySQL CREATE
  // TABLE / ALTER TABLE / ADD FK queries BEFORE server.listen(). On k8s the
  // readiness probe fired before the port was open, killing the pod. Now
  // the HTTP layer is live in <100ms and bootstrap runs afterwards. Any
  // request that lands mid-bootstrap either serves static assets (fine) or
  // hits a route whose table is being created (rare, returns 500 caught
  // by the frontend's retry — the /api/health probe never touches DB).
  server.listen(port, "0.0.0.0", () => {
    console.log(`[server] Running on http://0.0.0.0:${port}/ (bootstrap running in background)`);
  });

  // ── Also listen on the frontend port so k8s probe on :3000 passes ─────
  // Emergent's ingress expects a frontend service on :3000. In this
  // monolithic setup, both ports serve the same Express app (which handles
  // /api/* AND static SPA assets). Skip if it collides with the backend
  // port (e.g. someone overrides PORT to 3000).
  if (frontendPort !== port) {
    const frontendServer = createServer(app);
    frontendServer.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[server] port ${frontendPort} already in use — frontend listener skipped`);
      } else {
        console.error(`[server] frontend listener error on :${frontendPort}:`, err);
      }
    });
    frontendServer.listen(frontendPort, "0.0.0.0", () => {
      console.log(`[server] Also listening on http://0.0.0.0:${frontendPort}/ (frontend port)`);
    });
  }

  // ── Bind port 8080 too — Emergent's default deploy contract ───────────
  // Emergent's platform default readiness probe targets :8080 with either
  // GET / (frontend contract) or GET /health (backend contract). Support
  // already adjusted THIS deploy's manifest to :8001, but binding 8080
  // future-proofs us against fresh deploys / forks reverting to the
  // default probe port. Belt + braces.
  const platformPort = 8080;
  if (platformPort !== port && platformPort !== frontendPort) {
    const platformServer = createServer(app);
    platformServer.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[server] port ${platformPort} already in use — platform listener skipped`);
      } else {
        console.error(`[server] platform listener error on :${platformPort}:`, err);
      }
    });
    platformServer.listen(platformPort, "0.0.0.0", () => {
      console.log(`[server] Also listening on http://0.0.0.0:${platformPort}/ (platform default probe port)`);
    });
  }

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
    // quiz_picks — one row per /quiz completion. See drizzle/schema.ts
    // for the design rationale. Created here so it lives without a
    // migration step.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quiz_picks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        session_id VARCHAR(64) NOT NULL,
        wine_type VARCHAR(16) NOT NULL,
        fruit VARCHAR(16) NOT NULL,
        body VARCHAR(16) NOT NULL,
        sweetness VARCHAR(16) NOT NULL,
        grip VARCHAR(16) NOT NULL,
        age VARCHAR(16) NOT NULL,
        budget VARCHAR(16) NOT NULL,
        winner_slug VARCHAR(80) NOT NULL,
        true_match_slug VARCHAR(80) NOT NULL,
        region VARCHAR(8) NOT NULL,
        cta_clicked_at BIGINT NULL,
        picked_at BIGINT NOT NULL,
        INDEX qp_picked_at_idx (picked_at),
        INDEX qp_winner_idx (winner_slug),
        INDEX qp_session_idx (session_id)
      )
    `);
    // gate_events (S3) — audit log for the shared-password wall.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gate_events (
        id INT PRIMARY KEY AUTO_INCREMENT,
        kind VARCHAR(24) NOT NULL,
        ip VARCHAR(64) NOT NULL,
        user_agent VARCHAR(300),
        path VARCHAR(300),
        occurred_at BIGINT NOT NULL,
        INDEX ge_occurred_idx (occurred_at),
        INDEX ge_kind_idx (kind),
        INDEX ge_ip_idx (ip)
      )
    `);
    // gate_invites — per-tester magic links (Feb 2026).
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gate_invites (
        id INT PRIMARY KEY AUTO_INCREMENT,
        token VARCHAR(48) NOT NULL UNIQUE,
        label VARCHAR(120) NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT,
        first_used_at BIGINT,
        last_used_at BIGINT,
        use_count INT NOT NULL DEFAULT 0,
        revoked_at BIGINT,
        INDEX gi_token_idx (token),
        INDEX gi_revoked_idx (revoked_at)
      )
    `);
    // quiz_leads (A5) — post-quiz email capture.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS quiz_leads (
        id INT PRIMARY KEY AUTO_INCREMENT,
        session_id VARCHAR(64) NOT NULL,
        email VARCHAR(200) NOT NULL,
        first_name VARCHAR(80),
        winery VARCHAR(120),
        winner_slug VARCHAR(80),
        region VARCHAR(8),
        captured_at BIGINT NOT NULL,
        INDEX ql_captured_idx (captured_at),
        INDEX ql_email_idx (email)
      )
    `);
    // wine_producers (A2 stub) — AU/NZ winery directory. Populated in a
    // later session from Wine Australia + NZ Wine public registers.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS marketing_task_completions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        task_slug VARCHAR(64) NOT NULL,
        completed_at BIGINT NOT NULL,
        local_date VARCHAR(10) NOT NULL,
        iso_week VARCHAR(8) NOT NULL,
        notes VARCHAR(500),
        INDEX mtc_task_idx (task_slug),
        INDEX mtc_localdate_idx (local_date),
        INDEX mtc_isoweek_idx (iso_week)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS marketing_coach_lines (
        id INT PRIMARY KEY AUTO_INCREMENT,
        local_date VARCHAR(10) NOT NULL,
        line VARCHAR(800) NOT NULL,
        season VARCHAR(24),
        generated_at BIGINT NOT NULL,
        INDEX mcl_localdate_idx (local_date)
      )
    `);
    // weather_advice_cache — Tier 3 (Environmental) LLM-contextualised
    // recommendations, one row per (winery, alert_kind, calendar-date).
    // Zero unauthenticated hits — gated behind the paying-plan check in
    // server/routers/weather.ts. Feb 2026.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS weather_advice_cache (
        id INT PRIMARY KEY AUTO_INCREMENT,
        winery_id INT NOT NULL,
        alert_kind VARCHAR(40) NOT NULL,
        local_date VARCHAR(10) NOT NULL,
        advice TEXT NOT NULL,
        current_reading VARCHAR(200),
        model VARCHAR(64),
        generated_at BIGINT NOT NULL,
        UNIQUE KEY wac_dedupe_key (winery_id, alert_kind, local_date),
        INDEX wac_localdate_idx (local_date)
      )
    `);
    // vessel_qual_flags — qualitative risk capture on Cellar Brief cards.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vessel_qual_flags (
        id INT PRIMARY KEY AUTO_INCREMENT,
        winery_id INT NOT NULL,
        vessel_id VARCHAR(40) NOT NULL,
        flag_type VARCHAR(32) NOT NULL,
        note VARCHAR(500),
        flagged_at BIGINT NOT NULL,
        resolved_at BIGINT,
        resolved_note VARCHAR(500),
        INDEX vqf_winery_vessel_idx (winery_id, vessel_id),
        INDEX vqf_active_idx (winery_id, resolved_at)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wine_producers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(200) NOT NULL,
        country VARCHAR(4) NOT NULL,
        region VARCHAR(120),
        website VARCHAR(300),
        email VARCHAR(200),
        contact_name VARCHAR(120),
        contact_role VARCHAR(120),
        size_bracket VARCHAR(24),
        phase1_source VARCHAR(60),
        last_touched_at BIGINT,
        touch_count INT NOT NULL DEFAULT 0,
        outreach_status VARCHAR(24) NOT NULL DEFAULT 'untouched',
        created_at BIGINT NOT NULL,
        INDEX wp_country_idx (country),
        INDEX wp_region_idx (region),
        INDEX wp_outreach_idx (outreach_status)
      )
    `);
    // ── Phase 1 multi-tenant bootstrap ───────────────────────────────────
    // Idempotent: creates `wineries` table, adds `winery_id` column to
    // users if missing, seeds a Default Winery, backfills NULL user
    // memberships to it. Safe to run on every boot. Phase 2 will flip
    // winery_id to NOT NULL once query refactor completes.
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS wineries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(64) NOT NULL UNIQUE,
        owner_user_id INT NOT NULL,
        plan ENUM('free','press','amphora','coopers','founding_member') NOT NULL DEFAULT 'free',
        region VARCHAR(128),
        brand_color VARCHAR(16),
        logo_url VARCHAR(512),
        created_at BIGINT NOT NULL,
        INDEX wineries_owner_idx (owner_user_id)
      )
    `);
    // ALTER TABLE ADD COLUMN IF NOT EXISTS is MySQL 8.0.29+ — most
    // managed providers including Railway are on it. Wrapped in
    // try/catch so older MySQL still boots; Phase 2 will validate.
    try {
      await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS winery_id INT NULL`);
    } catch (alterErr) {
      // Fallback for MySQL <8.0.29 — best-effort, ignore "duplicate column" errors.
      try {
        await db.execute(sql`ALTER TABLE users ADD COLUMN winery_id INT NULL`);
      } catch {
        // Column already exists, nothing to do.
        void alterErr;
      }
    }
    // Add public_audit_enabled column to wineries (Feb 2026, vanity URL feature).
    try {
      await db.execute(sql`ALTER TABLE wineries ADD COLUMN IF NOT EXISTS public_audit_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
    } catch {
      try {
        await db.execute(sql`ALTER TABLE wineries ADD COLUMN public_audit_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
      } catch {
        // already exists
      }
    }

    // Environmental config columns on wineries (Feb 2026 — Weather widget Slice 2).
    // Each winery can override the hardcoded Hunter Valley defaults with its
    // own GPS + cellar type + thresholds. Nullable — falls back to defaults
    // when a value is missing. All idempotent ALTERs.
    for (const alter of [
      "ADD COLUMN IF NOT EXISTS location_lat FLOAT NULL",
      "ADD COLUMN IF NOT EXISTS location_lng FLOAT NULL",
      "ADD COLUMN IF NOT EXISTS location_label VARCHAR(255) NULL",
      "ADD COLUMN IF NOT EXISTS cellar_type VARCHAR(24) NULL",
      "ADD COLUMN IF NOT EXISTS weather_thresholds_json TEXT NULL",
    ]) {
      try {
        await db.execute(sql.raw(`ALTER TABLE wineries ${alter}`));
      } catch {
        // Column already exists (MySQL <8.0.29 or re-run). Best-effort.
      }
    }

    // Create cellar_briefs table (Feb 2026, Cellar Brief feature).
    // Idempotent CREATE TABLE IF NOT EXISTS. Drizzle ORM only handles schema
    // for queries; the table itself is created here on first boot.
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS cellar_briefs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          winery_id INT NOT NULL,
          \`trigger\` VARCHAR(16) NOT NULL,
          attention_count INT NOT NULL DEFAULT 0,
          decisions_due_count INT NOT NULL DEFAULT 0,
          tank_count INT NOT NULL DEFAULT 0,
          summary_json TEXT NOT NULL,
          exec_summary VARCHAR(512),
          generated_at BIGINT NOT NULL,
          INDEX cb_winery_idx (winery_id),
          INDEX cb_generated_at_idx (generated_at),
          INDEX cb_winery_generated_idx (winery_id, generated_at),
          CONSTRAINT fk_cb_winery FOREIGN KEY (winery_id) REFERENCES wineries(id) ON DELETE CASCADE
        )
      `);
    } catch (e) {
      console.warn("[bootstrap] cellar_briefs table create skipped:", (e as Error).message);
    }

    // Create founding_reservations table (Feb 2026, launch-pivot feature).
    // Captures pre-payment warm leads while Stripe live keys are pending.
    // No FK: reservations can pre-date a users row entirely (Founding
    // Member reserves before they've ever logged in).
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS founding_reservations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(256) NOT NULL,
          name VARCHAR(256) NOT NULL,
          winery_name VARCHAR(256) NOT NULL,
          phone VARCHAR(64),
          tier ENUM('cellar','press','cellar_master') NOT NULL DEFAULT 'cellar',
          cycle ENUM('monthly','annual') NOT NULL DEFAULT 'monthly',
          referral_code VARCHAR(64),
          source VARCHAR(64) NOT NULL DEFAULT 'pricing_modal',
          status ENUM('pending','contacted','paid','cancelled') NOT NULL DEFAULT 'pending',
          reserved_at BIGINT NOT NULL,
          contacted_at BIGINT,
          notes TEXT,
          INDEX fr_email_idx (email),
          INDEX fr_status_idx (status),
          INDEX fr_reserved_at_idx (reserved_at)
        )
      `);
    } catch (e) {
      console.warn("[bootstrap] founding_reservations table create skipped:", (e as Error).message);
    }

    // ── Progressive-exposure + command-center tables (Feb 2026) ─────────
    // See drizzle/schema.ts for shape/comments. Idempotent DDL: safe to run
    // on every boot; MySQL will no-op if the tables + columns already exist.
    try {
      // Extend gate_invites with tier + operator metadata. Each ALTER runs
      // through a try/catch because MySQL 8.0.29+ supports "IF NOT EXISTS"
      // but Railway may still be on 8.0.27 in some pods.
      const alterInviteCols = [
        "ADD COLUMN tier VARCHAR(12) NOT NULL DEFAULT 'gate'",
        "ADD COLUMN member_name VARCHAR(120)",
        "ADD COLUMN winery_name VARCHAR(120)",
        "ADD COLUMN private_note TEXT",
        "ADD COLUMN paused_at BIGINT",
      ];
      for (const alter of alterInviteCols) {
        try {
          await db.execute(sql.raw(`ALTER TABLE gate_invites ${alter.replace("ADD COLUMN", "ADD COLUMN IF NOT EXISTS")}`));
        } catch {
          try { await db.execute(sql.raw(`ALTER TABLE gate_invites ${alter}`)); } catch { /* column already exists */ }
        }
      }
      try { await db.execute(sql`ALTER TABLE gate_invites ADD INDEX gi_tier_idx (tier)`); } catch { /* index already exists */ }

      // Member activity — one row per meaningful event. Powers progress
      // meter, health signals, timeline drawer, adoption analytics.
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS member_activity (
          id INT AUTO_INCREMENT PRIMARY KEY,
          gate_invite_id INT,
          user_id INT,
          kind VARCHAR(40) NOT NULL,
          details TEXT,
          device_fp VARCHAR(64),
          ip VARCHAR(64),
          user_agent VARCHAR(300),
          occurred_at BIGINT NOT NULL,
          INDEX ma_invite_idx (gate_invite_id, occurred_at),
          INDEX ma_user_idx (user_id, occurred_at),
          INDEX ma_kind_idx (kind, occurred_at),
          INDEX ma_recent_idx (occurred_at)
        )
      `);

      // Admin actions audit log — every override written here (reset,
      // extend, pause, revoke, advance, note, impersonate). Forensic trail
      // for "who changed what" and reversibility.
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS admin_actions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          actor_email VARCHAR(200) NOT NULL,
          target_gate_invite_id INT,
          target_label VARCHAR(200),
          action VARCHAR(40) NOT NULL,
          payload TEXT,
          occurred_at BIGINT NOT NULL,
          INDEX aa_target_idx (target_gate_invite_id, occurred_at),
          INDEX aa_actor_idx (actor_email, occurred_at),
          INDEX aa_recent_idx (occurred_at)
        )
      `);
    } catch (e) {
      console.warn("[bootstrap] command-center tables create skipped:", (e as Error).message);
    }

    // Seed Default Winery containing existing data. Owner is the seed admin.
    const seedOwnerOpenId = process.env.OWNER_OPEN_ID || "seed-owner-001";    const seedRows = await db.execute(sql`SELECT id FROM users WHERE open_id = ${seedOwnerOpenId} LIMIT 1`);
    type SeedRow = { id: number };
    const seedRowArr = (seedRows as unknown as [SeedRow[]])[0] || [];
    if (Array.isArray(seedRowArr) && seedRowArr[0]?.id) {
      const seedUserId = seedRowArr[0].id;
      await db.execute(sql`
        INSERT IGNORE INTO wineries (name, slug, owner_user_id, plan, region, created_at)
        VALUES ('Ownology Cellars', 'ownology-cellars', ${seedUserId}, 'founding_member', 'Hunter Valley, NSW', ${Date.now()})
      `);
      // Backfill: any user with NULL winery_id gets the Default Winery.
      const defaultRows = await db.execute(sql`SELECT id FROM wineries WHERE slug = 'redstone-ridge' LIMIT 1`);
      const defaultRowArr = (defaultRows as unknown as [SeedRow[]])[0] || [];
      const defaultWineryId = Array.isArray(defaultRowArr) ? defaultRowArr[0]?.id : undefined;
      if (defaultWineryId) {
        await db.execute(sql`UPDATE users SET winery_id = ${defaultWineryId} WHERE winery_id IS NULL`);
      }
    }

    // ── Phase 2 multi-tenant bootstrap ──────────────────────────────────
    // Idempotent: for every customer-domain table, add winery_id INT NULL
    // (no-op if already there), then backfill from the row's userId
    // → users.winery_id. Safe to run on every boot. Once each table has
    // been live for 24h with zero NULL inserts, a follow-up migration can
    // flip these columns to NOT NULL + FK to wineries(id).
    const customerTables = [
      { table: "vintage_log_entries", userCol: "user_id", indexName: "vle_winery_idx" },
      { table: "wine_batches",        userCol: "user_id", indexName: "wb_winery_idx" },
      { table: "cellar_equipment",    userCol: "user_id", indexName: "ce_winery_idx" },
      { table: "cellar_tasks",        userCol: "user_id", indexName: "ct_winery_idx" },
      { table: "barrels",             userCol: "user_id", indexName: "barrel_winery_idx" },
      { table: "packaging_inventory", userCol: "user_id", indexName: "pkg_winery_idx" },
      { table: "vineyard_blocks",     userCol: "user_id", indexName: "vb_winery_idx" },
      { table: "vineyard_observations", userCol: "user_id", indexName: "vo_winery_idx" },
      { table: "tank_reminders",      userCol: "user_id", indexName: "tr_winery_idx" },
      // SOP notes/training are keyed by created_by (varchar) — fold via
      // users.email when present. NULL stays NULL for legacy rows; new
      // inserts include wineryId directly.
      { table: "sop_vintage_notes",   userCol: null,      indexName: "svn_winery_idx" },
      { table: "sop_training_records", userCol: null,     indexName: "str_winery_idx" },
    ] as const;

    for (const { table, userCol, indexName } of customerTables) {
      // Add the column (no-op if already exists on MySQL 8.0.29+).
      try {
        await db.execute(sql.raw(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS winery_id INT NULL`));
      } catch {
        try {
          await db.execute(sql.raw(`ALTER TABLE ${table} ADD COLUMN winery_id INT NULL`));
        } catch {
          // Column already exists — fine.
        }
      }
      // Add the index (no-op if exists).
      try {
        await db.execute(sql.raw(`CREATE INDEX ${indexName} ON ${table} (winery_id)`));
      } catch {
        // Index already exists — fine.
      }
      // Backfill from users.winery_id when the row carries a user_id link.
      if (userCol) {
        try {
          await db.execute(sql.raw(
            `UPDATE ${table} t
             JOIN users u ON u.id = t.${userCol}
             SET t.winery_id = u.winery_id
             WHERE t.winery_id IS NULL AND u.winery_id IS NOT NULL`
          ));
        } catch (e) {
          console.warn(`[bootstrap] backfill ${table} skipped:`, (e as Error).message);
        }
      }
    }
    console.log("[bootstrap] multi-tenant scaffolding ready");

    // ── Phase 2 lockdown: NOT NULL + FK ──────────────────────────────────
    // Self-applies on each boot: only flips winery_id → NOT NULL when zero
    // NULL rows remain for that table, and only adds the FK if it doesn't
    // already exist. Idempotent + safe — running on a fully-locked DB is
    // a no-op. Running on a DB with NULL rows skips silently with a log.
    //
    // ON DELETE CASCADE: deleting a winery row drops all its customer-domain
    // children. Matches the tenancy mental model (a winery owns its data)
    // and prevents orphan rows.
    //
    // FK constraint names follow the pattern fk_<short>_winery so the SQL
    // is greppable in the schema dump.
    const lockTargets: Array<{ table: string; fkName: string }> = [
      { table: "vintage_log_entries",   fkName: "fk_vle_winery" },
      { table: "wine_batches",          fkName: "fk_wb_winery" },
      { table: "cellar_equipment",      fkName: "fk_ce_winery" },
      { table: "cellar_tasks",          fkName: "fk_ct_winery" },
      { table: "barrels",               fkName: "fk_barrel_winery" },
      { table: "packaging_inventory",   fkName: "fk_pkg_winery" },
      { table: "vineyard_blocks",       fkName: "fk_vb_winery" },
      { table: "vineyard_observations", fkName: "fk_vo_winery" },
      { table: "tank_reminders",        fkName: "fk_tr_winery" },
      // SOP notes/training currently keep nullable winery_id (legacy rows
      // pre-date the column and the migration can't backfill via user_id
      // because they're keyed on created_by varchar). Skip the lockdown
      // until a manual backfill is done.
    ];

    for (const { table, fkName } of lockTargets) {
      try {
        // 1. Check there are zero NULL rows — never break prod by trying
        //    to flip a column that still has unbackfilled data.
        const nullCheck = await db.execute(sql.raw(
          `SELECT COUNT(*) AS nulls FROM ${table} WHERE winery_id IS NULL`
        ));
        const nullCount = Number(((nullCheck as unknown as [Array<{ nulls: number }>])[0]?.[0]?.nulls) ?? 0);
        if (nullCount > 0) {
          console.warn(`[bootstrap] ${table}: ${nullCount} NULL winery_id rows — lockdown deferred`);
          continue;
        }
        // 1b. Sweep orphan rows pointing to a winery_id that no longer
        //     exists. This can happen when a winery was deleted before
        //     the FK was in place (e.g. failed test cleanup, manual SQL).
        //     Without this, the ADD CONSTRAINT below fails with
        //     ER_NO_REFERENCED_ROW_2 and the table stays unlocked.
        try {
          await db.execute(sql.raw(
            `DELETE t FROM ${table} t LEFT JOIN wineries w ON w.id = t.winery_id WHERE w.id IS NULL`
          ));
        } catch (e) {
          console.warn(`[bootstrap] ${table} orphan sweep skipped:`, (e as Error).message);
        }
        // 2. Flip the column to NOT NULL. If already NOT NULL, MySQL
        //    accepts the same definition without error.
        try {
          await db.execute(sql.raw(`ALTER TABLE ${table} MODIFY COLUMN winery_id INT NOT NULL`));
        } catch (e) {
          console.warn(`[bootstrap] ${table} MODIFY NOT NULL skipped:`, (e as Error).message);
        }
        // 3. Add the FK only when missing. INFORMATION_SCHEMA is the
        //    reliable cross-version way to detect an existing constraint.
        const fkExistsRes = await db.execute(sql.raw(
          `SELECT COUNT(*) AS c FROM information_schema.TABLE_CONSTRAINTS
           WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = '${table}'
             AND CONSTRAINT_NAME = '${fkName}'`
        ));
        const fkExists = Number(((fkExistsRes as unknown as [Array<{ c: number }>])[0]?.[0]?.c) ?? 0) > 0;
        if (!fkExists) {
          try {
            await db.execute(sql.raw(
              `ALTER TABLE ${table} ADD CONSTRAINT ${fkName}
                 FOREIGN KEY (winery_id) REFERENCES wineries(id) ON DELETE CASCADE`
            ));
            console.log(`[bootstrap] ${table}: locked down (NOT NULL + ${fkName})`);
          } catch (e) {
            console.warn(`[bootstrap] ${table} ADD FK ${fkName} failed:`, (e as Error).message);
          }
        }
      } catch (e) {
        console.warn(`[bootstrap] lockdown for ${table} skipped:`, (e as Error).message);
      }
    }
  } catch (e) {
    console.warn("[bootstrap] table create skipped:", (e as Error).message);
  }
  // NOTE: server.listen() has already been called above (before bootstrap).
  // Do NOT re-listen here — that would throw EADDRINUSE.
}

startServer().catch(console.error);
