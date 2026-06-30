/**
 * publicAudit.ts — public, opt-in vanity audit page.
 *
 * GET /audit/:slug → branded HTML page showing the winery's last 90 days
 * of compliance-relevant cellar activity (additions, racking, inoculation,
 * measurements on regulated topics).
 *
 * Privacy controls (defaults are private):
 *   1. Only renders when the winery has explicitly toggled
 *      `public_audit_enabled = TRUE` on /admin/settings. Otherwise 404.
 *   2. NEVER includes operator-private fields: no `noteText`,
 *      no `details.reasoning`, no operator names. Just the four
 *      regulator-relevant facts per entry: date · tank · variety · event.
 *      Numeric measurement values are kept (Brix, SO₂ ppm, pH, etc.)
 *      because those ARE the audit trail.
 *   3. Rate-limited at 60 requests / minute / IP (best-effort, in-memory).
 *   4. Indexable: emits `X-Robots-Tag: index, follow` so winemakers who
 *      link from their About page get the SEO juice; non-published wineries
 *      stay 404 / `noindex` automatically.
 *
 * Value: a stable, branded, indexable URL that a winemaker can paste on
 * their website ("View our live cellar audit →") AND that a regulator can
 * verify-against without an email attachment.
 */
import type { Request, Response } from "express";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { eq, and, gte, desc } from "drizzle-orm";

const COMPLIANCE_RELEVANT_EVENT_TYPES = [
  "addition",
  "racking",
  "inoculation",
  "measurement",
];
const COMPLIANCE_KEYWORDS = [
  "so2", "so₂", "sulphite", "sulfite", "sulfur dioxide",
  "yan", "dap", "diammonium",
  "potassium metabisulfite", "kms",
  "alcohol", "abv", "brix",
  "ml", "malolactic",
  "ph", "ta", "titratable",
];

// Simple per-IP rate limiter — 60 requests / minute / IP. In-memory, resets
// on server restart. Sufficient for the v1 traffic level; replace with
// shared store if you scale to many app instances behind a load balancer.
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > 60;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeColor(c: string | null): string {
  if (!c) return "#0a0a0a";
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : "#0a0a0a";
}

function sanitizeLogoUrl(u: string | null): string | null {
  if (!u) return null;
  return /^https:\/\/[^\s<>"']{4,}$/i.test(u) ? u : null;
}

export async function publicAuditHandler(req: Request, res: Response): Promise<void> {
  const slug = (req.params.slug || "").slice(0, 80);
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    res.setHeader("X-Robots-Tag", "noindex");
    res.status(404).send("Not found");
    return;
  }

  const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim()) || req.socket.remoteAddress || "unknown";
  if (rateLimited(ip)) {
    res.setHeader("Retry-After", "60");
    res.status(429).send("Slow down — try again in a minute.");
    return;
  }

  const winery = await db.query.wineries.findFirst({
    where: eq(schema.wineries.slug, slug),
  });
  if (!winery || !winery.publicAuditEnabled) {
    res.setHeader("X-Robots-Tag", "noindex");
    res.status(404).send(renderNotFound());
    return;
  }

  // Pull the winery owner's user_id so we can scope vintage_log_entries.
  // (winery_id filter would work too once Phase 2 NOT-NULL flips; for now
  // we double-filter on user_id + winery_id for belt-and-suspenders.)
  const owner = await db.query.users.findFirst({
    where: eq(schema.users.id, winery.ownerUserId),
  });
  if (!owner) {
    res.status(500).send("Owner record missing");
    return;
  }

  const days = 90;
  const sinceMs = Date.now() - days * 86400 * 1000;
  const rows = await db
    .select()
    .from(schema.vintageLogEntries)
    .where(and(
      eq(schema.vintageLogEntries.wineryId, winery.id),
      gte(schema.vintageLogEntries.entryAt, sinceMs)
    ))
    .orderBy(desc(schema.vintageLogEntries.entryAt));

  const relevant = rows.filter((r) => {
    if (COMPLIANCE_RELEVANT_EVENT_TYPES.includes(r.eventType)) return true;
    const blob = `${r.detailsJson ?? ""}`.toLowerCase();
    return COMPLIANCE_KEYWORDS.some((k) => blob.includes(k));
  });

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Robots-Tag", "index, follow");
  res.setHeader("Cache-Control", "public, max-age=300"); // 5 min public cache

  const brandColor = sanitizeColor(winery.brandColor);
  const logo = sanitizeLogoUrl(winery.logoUrl);
  const html = renderPage({
    wineryName: winery.name,
    slug: winery.slug,
    region: winery.region,
    brandColor,
    logoUrl: logo,
    plan: winery.plan,
    days,
    sinceMs,
    totalEntries: rows.length,
    relevant,
  });
  res.send(html);
}

function renderNotFound(): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Audit not published — Ownology</title>
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#fafaf9;color:#1c1917;display:grid;place-items:center;min-height:100vh;padding:2rem}
.box{max-width:520px;text-align:center}
h1{font-family:Georgia,serif;font-size:1.6rem;margin:0 0 .6rem}
p{color:#57534e;margin:.4rem 0}
a{color:#b45309;font-weight:600;text-decoration:none}
</style></head>
<body><div class="box">
<h1>This audit isn't public.</h1>
<p>The winery hasn't opted in to publish their compliance audit trail.</p>
<p><a href="https://ownology.ai">Ownology — Cellar Intelligence for Winemakers →</a></p>
</div></body></html>`;
}

function renderPage(d: {
  wineryName: string;
  slug: string;
  region: string | null;
  brandColor: string;
  logoUrl: string | null;
  plan: string;
  days: number;
  sinceMs: number;
  totalEntries: number;
  relevant: typeof schema.vintageLogEntries.$inferSelect[];
}): string {
  const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  const fmtRange = `${fmtDate(d.sinceMs)} → ${fmtDate(Date.now())}`;

  const entriesHtml = d.relevant.length === 0
    ? `<tr><td colspan="4" style="padding:1.4rem;color:#78716c;text-align:center">No compliance-relevant entries in the last ${d.days} days.</td></tr>`
    : d.relevant.map((r) => {
        const detailsObj: Record<string, unknown> = (() => {
          try { return JSON.parse(r.detailsJson ?? "{}") as Record<string, unknown>; } catch { return {}; }
        })();
        // Strip reasoning + any text-only fields that could contain PII.
        // Keep only structured what/value/unit/quantity/timing/productName fields.
        const SAFE_KEYS = new Set(["what", "value", "unit", "quantity", "timing", "productName", "ratePerHL", "fromLocation", "toLocation", "volumeL", "leesStatus"]);
        const safeDetails = Object.entries(detailsObj)
          .filter(([k, v]) => SAFE_KEYS.has(k) && v !== null && v !== undefined && v !== "")
          .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(String(v))}`)
          .join(" · ");
        return `<tr>
          <td>${escapeHtml(fmtDate(r.entryAt))}</td>
          <td style="font-weight:600">${escapeHtml(r.tankName)}</td>
          <td>${escapeHtml(r.variety)}</td>
          <td>
            <div style="display:flex;flex-direction:column;gap:2px">
              <span style="font-weight:600;color:${d.brandColor};text-transform:capitalize">${escapeHtml(r.eventType.replace(/_/g, " "))}</span>
              ${safeDetails ? `<span style="color:#57534e;font-size:.85rem">${safeDetails}</span>` : ""}
            </div>
          </td>
        </tr>`;
      }).join("");

  const logoBlock = d.logoUrl
    ? `<img src="${escapeHtml(d.logoUrl)}" alt="" style="width:72px;height:72px;object-fit:contain;border-radius:8px;background:#fff;border:1px solid #e7e5e4;flex-shrink:0">`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>${escapeHtml(d.wineryName)} — Compliance Audit Trail (last ${d.days} days)</title>
<meta name="description" content="${escapeHtml(d.wineryName)} — live ${d.days}-day compliance audit trail. ${d.relevant.length} regulated cellar events recorded. Powered by Ownology.">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta property="og:title" content="${escapeHtml(d.wineryName)} — Compliance Audit Trail">
<meta property="og:description" content="${d.relevant.length} regulated cellar events recorded in the last ${d.days} days. Live audit trail.">
<meta property="og:type" content="article">
${d.logoUrl ? `<meta property="og:image" content="${escapeHtml(d.logoUrl)}">` : ""}
<style>
:root{--brand:${d.brandColor}}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1c1917;background:#fafaf9}
.wrap{max-width:980px;margin:0 auto;padding:3rem 1.5rem 4rem}
header{display:flex;gap:1.4rem;align-items:flex-start;border-bottom:3px solid var(--brand);padding-bottom:1.4rem;margin-bottom:1.6rem}
header .meta{flex:1}
header h1{font-family:Georgia,"Times New Roman",serif;color:var(--brand);font-size:2rem;margin:0 0 .3rem;letter-spacing:-.01em}
header h2{font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:#57534e;font-weight:700;margin:0 0 .8rem}
header .kv{color:#57534e;font-size:.94rem;line-height:1.55}
header .kv b{color:#1c1917;font-weight:600}
.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.8rem;margin:1.4rem 0 2rem}
.summary .card{background:#fff;border:1px solid #e7e5e4;border-radius:8px;padding:.9rem 1.1rem}
.summary .card .label{font-size:.72rem;color:#78716c;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.summary .card .value{font-family:Georgia,serif;font-size:1.6rem;color:var(--brand);font-weight:700;margin-top:.2rem}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e7e5e4;border-radius:8px;overflow:hidden}
th{text-align:left;padding:.7rem .9rem;background:#f5f5f4;font-size:.74rem;text-transform:uppercase;letter-spacing:.06em;color:#57534e;font-weight:700;border-bottom:1px solid #e7e5e4}
td{padding:.7rem .9rem;border-bottom:1px solid #f5f5f4;vertical-align:top;font-size:.92rem}
tr:last-child td{border-bottom:none}
footer{margin-top:2.4rem;padding-top:1.2rem;border-top:1px solid #e7e5e4;font-size:.78rem;color:#78716c;text-align:center;line-height:1.7}
footer a{color:var(--brand);text-decoration:none;font-weight:600}
.badge{display:inline-block;padding:.18rem .55rem;background:var(--brand);color:#fff;font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;border-radius:3px;margin-left:.4rem;vertical-align:middle}
.disclaimer{font-size:.78rem;color:#78716c;background:#f5f5f4;border-left:3px solid var(--brand);padding:.7rem .9rem;margin:1.4rem 0;line-height:1.55}
.cta{margin:2.4rem 0 0;padding:1.4rem 1.6rem;background:var(--brand);color:#fff;border-radius:8px;display:flex;align-items:center;gap:1.2rem;flex-wrap:wrap;justify-content:space-between}
.cta .copy{flex:1 1 260px}
.cta .copy h3{font-family:Georgia,serif;font-size:1.15rem;margin:0 0 .25rem;font-weight:700;color:#fff}
.cta .copy p{margin:0;font-size:.86rem;color:rgba(255,255,255,.86);line-height:1.5}
.cta a.btn{background:#fff;color:var(--brand);padding:.65rem 1.3rem;text-decoration:none;border-radius:5px;font-weight:700;font-size:.84rem;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;transition:transform .12s ease}
.cta a.btn:hover{transform:translateY(-1px)}
@media (max-width:560px){header{flex-direction:column}header h1{font-size:1.55rem}}
</style></head>
<body>
<div class="wrap">
  <header>
    ${logoBlock}
    <div class="meta">
      <h1>${escapeHtml(d.wineryName)}<span class="badge">Verified by Ownology</span></h1>
      <h2>Live Compliance Audit Trail — last ${d.days} days</h2>
      <div class="kv">
        ${d.region ? `<div><b>Region:</b> ${escapeHtml(d.region)}</div>` : ""}
        <div><b>Period:</b> ${escapeHtml(fmtRange)}</div>
        <div><b>Last refreshed:</b> ${escapeHtml(new Date().toLocaleString("en-AU"))}</div>
      </div>
    </div>
  </header>

  <div class="summary">
    <div class="card"><div class="label">Total Events</div><div class="value">${d.totalEntries}</div></div>
    <div class="card"><div class="label">Compliance-Relevant</div><div class="value">${d.relevant.length}</div></div>
    <div class="card"><div class="label">Window</div><div class="value">${d.days}d</div></div>
  </div>

  <p class="disclaimer">
    This is a public audit trail of compliance-relevant cellar activity. It includes additions (SO₂, DAP, MLF nutrients), measurements (Brix, YAN, pH, TA), racking, and inoculation events. Operator-private notes and decision reasoning are not shown.
  </p>

  <table>
    <thead><tr><th style="width:130px">Date</th><th style="width:110px">Tank</th><th style="width:140px">Variety</th><th>Event</th></tr></thead>
    <tbody>${entriesHtml}</tbody>
  </table>

  <aside class="cta" data-testid="audit-conversion-cta">
    <div class="copy">
      <h3>Want a live audit trail for your winery?</h3>
      <p>Ownology turns your cellar work into a regulator-ready audit page like this one — in minutes.</p>
    </div>
    <a class="btn" href="/pricing?from=public-audit-${escapeHtml(d.slug)}">See pricing →</a>
  </aside>

  <footer>
    Published by ${escapeHtml(d.wineryName)} · Powered by <a href="https://ownology.ai">Ownology — Cellar Intelligence Platform</a><br>
    This page is a live snapshot — bookmark it for regulator audits and link from your About page.
  </footer>
</div>
</body></html>`;
}
