/**
 * eventsRouter — site-wide click-sequence tracking. Records page views,
 * clicks on elements with a data-testid and section views (never typed
 * values). Attributed to the signed-in user and/or an outreach invite slug
 * (?for=<slug>). Owner-only queries power /admin/activity.
 */
import { z } from "zod";
import { sql } from "drizzle-orm";
import { createHash } from "crypto";
import { router, publicProcedure, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";

const hashIp = (raw: string | null | undefined) => createHash("sha256").update(raw || "unknown").digest("hex").slice(0, 32);

const IP_DAILY_MAX = 3000;
const ipLog = new Map<string, { day: number; n: number }>();
const PROD_URL = (process.env.OWNOLOGY_PROD_URL || "https://www.ownology.ai").replace(/\/$/, "");

async function rows<T>(q: ReturnType<typeof sql>): Promise<T[]> {
  const [res] = await db.execute(q);
  return res as unknown as T[];
}

function allowIp(ip: string, n: number): boolean {
  const day = Math.floor(Date.now() / 86_400_000);
  const e = ipLog.get(ip);
  const cur = e && e.day === day ? e : { day, n: 0 };
  if (cur.n + n > IP_DAILY_MAX) return false;
  cur.n += n;
  ipLog.set(ip, cur);
  return true;
}

async function alertFirstVisit(slug: string) {
  const alertTo = process.env.OPERATOR_ALERT_EMAIL || process.env.OWNER_EMAIL;
  const key = process.env.RESEND_API_KEY;
  if (!alertTo || !key || slug.startsWith("e1test")) return;
  const [c] = await rows<{ first_name: string; winery: string | null }>(sql`SELECT first_name, winery FROM outreach_contacts WHERE slug = ${slug} LIMIT 1`);
  if (!c) return;
  fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Ownology Alerts <alerts@ownology.ai>",
      to: [alertTo],
      subject: `📡 ${c.first_name} just opened their Ownology link${c.winery ? ` — ${c.winery}` : ""}`,
      text: `${c.first_name}${c.winery ? ` from ${c.winery}` : ""} is on the site right now.\n\nWatch their clicks live: ${PROD_URL}/admin/activity?slug=${encodeURIComponent(slug)}`,
    }),
  }).catch(() => {});
}

const eventInput = z.object({
  event: z.enum(["page_view", "click", "section_view", "guide_step", "custom"]),
  path: z.string().max(300),
  detail: z.string().max(600).default(""),
  at: z.number().int().positive(),
});

export const eventsRouter = router({
  batch: publicProcedure
    .input(z.object({
      sessionId: z.string().min(8).max(64),
      invite: z.string().trim().max(120).optional(),
      events: z.array(eventInput).min(1).max(50),
    }))
    .mutation(async ({ input, ctx }) => {
      const xff = ctx.req.headers["x-forwarded-for"];
      const ip = hashIp(typeof xff === "string" && xff ? xff.split(",")[0]!.trim() : ctx.req.socket?.remoteAddress);
      if (!allowIp(ip, input.events.length)) return { ok: false };
      let slug: string | null = null;
      const isOperator = ctx.user?.role === "admin";
      if (input.invite && !isOperator) {
        const [c] = await rows<{ slug: string }>(sql`SELECT slug FROM outreach_contacts WHERE slug = ${input.invite} LIMIT 1`);
        slug = c?.slug ?? null;
      }
      if (slug) {
        const [ins] = await db.execute(sql`INSERT IGNORE INTO invite_alerts (slug, created_at) VALUES (${slug}, ${Date.now()})`);
        if ((ins as unknown as { affectedRows: number }).affectedRows === 1) void alertFirstVisit(slug);
      }
      const userId = ctx.user?.userId ?? null;
      const now = Date.now();
      for (const e of input.events) {
        const at = Math.max(now - 3_600_000, Math.min(e.at, now));
        await db.execute(sql`
          INSERT INTO user_events (user_id, slug, session_id, path, event, detail, ip_hash, created_at)
          VALUES (${userId}, ${slug}, ${input.sessionId}, ${e.path}, ${e.event}, ${e.detail}, ${ip}, ${at})`);
      }
      return { ok: true, inviteValid: input.invite ? !!slug || isOperator : undefined };
    }),

  people: ownerProcedure.query(async () => {
    const since = Date.now() - 30 * 86_400_000;
    const invited = await rows<{ slug: string; first_name: string; last_name: string | null; winery: string | null; n: number; sessions: number; first_at: number; last_at: number }>(sql`
      SELECT e.slug, c.first_name, c.last_name, c.winery, COUNT(*) AS n, COUNT(DISTINCT e.session_id) AS sessions,
        MIN(e.created_at) AS first_at, MAX(e.created_at) AS last_at
      FROM user_events e JOIN outreach_contacts c ON c.slug = e.slug
      WHERE e.slug IS NOT NULL GROUP BY e.slug, c.first_name, c.last_name, c.winery ORDER BY last_at DESC LIMIT 100`);
    const members = await rows<{ user_id: number; name: string | null; email: string | null; n: number; sessions: number; last_at: number }>(sql`
      SELECT e.user_id, u.name, u.email, COUNT(*) AS n, COUNT(DISTINCT e.session_id) AS sessions, MAX(e.created_at) AS last_at
      FROM user_events e JOIN users u ON u.id = e.user_id
      WHERE e.user_id IS NOT NULL AND e.created_at > ${since} AND e.path NOT LIKE '/admin%'
      GROUP BY e.user_id, u.name, u.email ORDER BY last_at DESC LIMIT 100`);
    const [anon] = await rows<{ sessions: number; n: number }>(sql`
      SELECT COUNT(DISTINCT session_id) AS sessions, COUNT(*) AS n FROM user_events
      WHERE slug IS NULL AND user_id IS NULL AND created_at > ${since}`);
    return {
      invited: invited.map((r) => ({ slug: r.slug, name: [r.first_name, r.last_name].filter(Boolean).join(" "), winery: r.winery ?? "", events: Number(r.n), sessions: Number(r.sessions), firstAt: Number(r.first_at), lastAt: Number(r.last_at) })),
      members: members.map((r) => ({ userId: r.user_id, name: r.name ?? "", email: r.email ?? "", events: Number(r.n), sessions: Number(r.sessions), lastAt: Number(r.last_at) })),
      anonymous: { sessions: Number(anon?.sessions ?? 0), events: Number(anon?.n ?? 0) },
    };
  }),

  person: ownerProcedure
    .input(z.object({ slug: z.string().max(120).optional(), userId: z.number().int().optional() }))
    .query(async ({ input }) => {
      let email: string | null = null;
      let label = "";
      let userId = input.userId ?? null;
      if (input.slug) {
        const [c] = await rows<{ first_name: string; last_name: string | null; winery: string | null; email: string | null }>(sql`
          SELECT first_name, last_name, winery, email FROM outreach_contacts WHERE slug = ${input.slug} LIMIT 1`);
        email = c?.email ?? null;
        label = c ? `${[c.first_name, c.last_name].filter(Boolean).join(" ")}${c.winery ? ` · ${c.winery}` : ""}` : input.slug;
        if (email && !userId) {
          const [u] = await rows<{ id: number }>(sql`SELECT id FROM users WHERE LOWER(email) = ${email.toLowerCase()} LIMIT 1`);
          userId = u?.id ?? null;
        }
      }
      let vault: null | { signedUpAt: number; winery: string; wines: number; logs: number; contractors: number; recent: { action: string; target: string; at: number }[] } = null;
      if (userId) {
        const [u] = await rows<{ name: string | null; email: string | null; created_at: number; winery_id: number | null }>(sql`
          SELECT name, email, created_at, winery_id FROM users WHERE id = ${userId} LIMIT 1`);
        if (u) {
          if (!label) label = u.name || u.email || `User ${userId}`;
          if (u.winery_id) {
            const w = u.winery_id;
            const [wn] = await rows<{ name: string }>(sql`SELECT name FROM wineries WHERE id = ${w} LIMIT 1`);
            const [c1] = await rows<{ n: number }>(sql`SELECT COUNT(*) AS n FROM brand_wines WHERE winery_id = ${w} AND archived_at IS NULL`);
            const [c2] = await rows<{ n: number }>(sql`SELECT COUNT(*) AS n FROM brand_wine_logs WHERE winery_id = ${w}`);
            const [c3] = await rows<{ n: number }>(sql`SELECT COUNT(*) AS n FROM brand_members WHERE winery_id = ${w} AND revoked_at IS NULL`);
            const recent = await rows<{ action: string; target: string; created_at: number }>(sql`
              SELECT action, target, created_at FROM brand_activity WHERE winery_id = ${w} ORDER BY created_at DESC LIMIT 20`);
            vault = {
              signedUpAt: Number(u.created_at), winery: wn?.name ?? "", wines: Number(c1?.n ?? 0), logs: Number(c2?.n ?? 0), contractors: Number(c3?.n ?? 0),
              recent: recent.map((r) => ({ action: r.action, target: r.target, at: Number(r.created_at) })),
            };
          }
        }
      }
      const events = await rows<{ id: number; session_id: string; path: string; event: string; detail: string; created_at: number }>(sql`
        SELECT id, session_id, path, event, detail, created_at FROM user_events
        WHERE (${input.slug ?? null} IS NOT NULL AND slug = ${input.slug ?? null}) OR (${userId} IS NOT NULL AND user_id = ${userId})
        ORDER BY created_at DESC LIMIT 1000`);
      return {
        label,
        email,
        vault,
        events: events.map((e) => ({ id: Number(e.id), sessionId: e.session_id, path: e.path, event: e.event, detail: e.detail, at: Number(e.created_at) })),
      };
    }),
});
