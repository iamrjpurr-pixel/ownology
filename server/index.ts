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
import { publicAuditHandler } from "./publicAudit.js";
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

    // Seed Default Winery containing existing data. Owner is the seed admin.
    const seedOwnerOpenId = process.env.OWNER_OPEN_ID || "seed-owner-001";    const seedRows = await db.execute(sql`SELECT id FROM users WHERE open_id = ${seedOwnerOpenId} LIMIT 1`);
    type SeedRow = { id: number };
    const seedRowArr = (seedRows as unknown as [SeedRow[]])[0] || [];
    if (Array.isArray(seedRowArr) && seedRowArr[0]?.id) {
      const seedUserId = seedRowArr[0].id;
      await db.execute(sql`
        INSERT IGNORE INTO wineries (name, slug, owner_user_id, plan, region, created_at)
        VALUES ('Redstone Ridge Wines', 'redstone-ridge', ${seedUserId}, 'founding_member', 'Hunter Valley, NSW', ${Date.now()})
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
  server.listen(port, "0.0.0.0", () => {
    console.log(`[server] Running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch(console.error);
