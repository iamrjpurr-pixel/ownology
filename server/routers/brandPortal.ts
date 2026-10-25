/**
 * brandPortal — the Brand Vault. A brand owner records the IP for their
 * wines (blend specs, targets, protocols, tasting notes) and invites a
 * contract winemaker who can view specs + log work, but never edit specs,
 * export, or keep access after the owner revokes it.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc.js";
import { db } from "../db.js";
import type { Context } from "../trpc.js";

type Role = "owner" | "contractor";
type AuthedUser = NonNullable<Context["user"]>;

const PROD_URL = (process.env.OWNOLOGY_PROD_URL || "https://www.ownology.ai").replace(/\/$/, "");
const MAX_CONTRACTORS = 10;

async function rows<T>(q: ReturnType<typeof sql>): Promise<T[]> {
  const [res] = await db.execute(q);
  return res as unknown as T[];
}
async function insertId(q: ReturnType<typeof sql>): Promise<number> {
  const [res] = await db.execute(q);
  return Number((res as unknown as { insertId: number }).insertId);
}

const emailOf = (u: AuthedUser) => (u.email || "").toLowerCase().trim();

async function resolveRole(user: AuthedUser, wineryId: number): Promise<Role> {
  if (user.wineryId === wineryId) return "owner";
  const email = emailOf(user);
  const found = await rows<{ id: number }>(sql`
    SELECT id FROM brand_members
    WHERE winery_id = ${wineryId} AND revoked_at IS NULL
      AND (user_id = ${user.userId ?? -1} OR (${email} <> '' AND LOWER(email) = ${email}))
    LIMIT 1`);
  if (found.length) return "contractor";
  throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this brand." });
}

async function requireOwner(user: AuthedUser, wineryId: number) {
  const role = await resolveRole(user, wineryId);
  if (role !== "owner") {
    await logActivity(user, wineryId, role, "blocked", "Owner-only action attempted");
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the brand owner can do this." });
  }
}

async function logActivity(user: AuthedUser, wineryId: number, role: Role, action: string, target: string) {
  await db.execute(sql`
    INSERT INTO brand_activity (winery_id, actor_user_id, actor_email, actor_role, action, target, created_at)
    VALUES (${wineryId}, ${user.userId ?? null}, ${emailOf(user) || user.openId}, ${role}, ${action}, ${target.slice(0, 300)}, ${Date.now()})`);
}

type WineRow = {
  id: number; name: string; vintage: number | null; style: string;
  blend_json: string | null; targets_json: string | null; regime_json: string | null; protocol: string; tasting_notes: string;
  updated_at: number;
};
function toWine(r: WineRow) {
  return {
    id: r.id,
    name: r.name,
    vintage: r.vintage,
    style: r.style,
    blend: JSON.parse(r.blend_json || "[]") as { variety: string; pct: number; source: string }[],
    targets: JSON.parse(r.targets_json || "{}") as Record<string, string>,
    regime: JSON.parse(r.regime_json || "{}") as Record<string, string>,
    protocol: r.protocol,
    tastingNotes: r.tasting_notes,
    updatedAt: Number(r.updated_at),
  };
}

type LogRow = { id: number; author_email: string; author_role: Role; kind: string; note: string; readings_json: string | null; created_at: number };
function toLog(r: LogRow) {
  return {
    id: r.id,
    authorEmail: r.author_email,
    authorRole: r.author_role,
    kind: r.kind,
    note: r.note,
    readings: JSON.parse(r.readings_json || "{}") as Record<string, string>,
    createdAt: Number(r.created_at),
  };
}

async function getWineRow(wineryId: number, wineId: number) {
  const [w] = await rows<WineRow>(sql`
    SELECT * FROM brand_wines WHERE id = ${wineId} AND winery_id = ${wineryId} AND archived_at IS NULL LIMIT 1`);
  if (!w) throw new TRPCError({ code: "NOT_FOUND", message: "Wine not found" });
  return w;
}

const short = z.string().max(24).optional();
const wineInput = z.object({
  name: z.string().trim().min(1).max(160),
  vintage: z.number().int().min(1900).max(2100).nullable(),
  style: z.string().max(160).default(""),
  blend: z.array(z.object({
    variety: z.string().trim().min(1).max(80),
    pct: z.number().min(0).max(100),
    source: z.string().max(160).default(""),
  })).max(12).default([]),
  targets: z.object({ alcohol: short, ph: short, ta: short, rs: short, so2: short, va: short }).default({}),
  regime: z.object({
    yeast: z.string().max(600).optional(),
    fermentTemp: z.string().max(600).optional(),
    mlf: z.string().max(600).optional(),
    oak: z.string().max(600).optional(),
    additions: z.string().max(600).optional(),
    finishing: z.string().max(600).optional(),
    bottling: z.string().max(600).optional(),
  }).default({}),
  protocol: z.string().max(8000).default(""),
  tastingNotes: z.string().max(4000).default(""),
});
const brandId = z.object({ wineryId: z.number().int().positive() });

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function sendContractorInvite(to: string, rawBrand: string, inviterEmail: string) {
  const brandName = esc(rawBrand);
  const key = process.env.RESEND_API_KEY;
  const link = `${PROD_URL}/login?next=/brand`;
  if (!key) {
    console.log(`[BrandVault] (dev) invite for ${to} to ${brandName} → ${link}`);
    return;
  }
  const from = process.env.ALERT_FROM_EMAIL || "onboarding@resend.dev";
  const html = `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f6f4ef;font-family:-apple-system,Segoe UI,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border-top:6px solid #b8860b">
  <tr><td style="padding:28px 32px">
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#b8860b">Ownology</h1>
    <p style="font-size:15px;line-height:1.6">${brandName} has shared their Brand Vault with you on Ownology.</p>
    <p style="font-size:15px;line-height:1.6">You'll see their wine specs and protocols, and you can log your cellar work and lab readings against each wine, so you're both working from the same record. ${brandName} keeps ownership of the specs, so editing and exporting stay with them.</p>
    <p style="margin:24px 0;text-align:center"><a href="${link}" style="display:inline-block;padding:12px 28px;background:#b8860b;color:#fff;text-decoration:none;border-radius:6px;font-weight:700">Open the Brand Vault</a></p>
    <p style="font-size:13px;color:#6b7280">Sign in with this email address (${to}) and the brand appears automatically. Invited by ${esc(inviterEmail)}.</p>
  </td></tr></table></body></html>`;
  try {
    const { Resend } = await import("resend");
    await new Resend(key).emails.send({
      from: `${process.env.ALERT_FROM_NAME || "Ownology"} <${from}>`,
      to,
      subject: `${rawBrand} invited you to their Brand Vault`,
      html,
      replyTo: inviterEmail || undefined,
    });
  } catch (err) {
    console.error("[BrandVault] invite send failed:", (err as Error).message);
  }
}

export const brandPortalRouter = router({
  myBrands: protectedProcedure.query(async ({ ctx }) => {
    const email = emailOf(ctx.user);
    if (email && ctx.user.userId) {
      await db.execute(sql`
        UPDATE brand_members SET user_id = ${ctx.user.userId}, accepted_at = COALESCE(accepted_at, ${Date.now()})
        WHERE LOWER(email) = ${email} AND user_id IS NULL AND revoked_at IS NULL`);
    }
    const brands: { wineryId: number; name: string; role: Role }[] = [];
    if (ctx.user.wineryId) {
      const [own] = await rows<{ id: number; name: string }>(sql`SELECT id, name FROM wineries WHERE id = ${ctx.user.wineryId} LIMIT 1`);
      if (own) brands.push({ wineryId: own.id, name: own.name, role: "owner" });
    }
    const contracted = await rows<{ winery_id: number; name: string }>(sql`
      SELECT DISTINCT m.winery_id, w.name FROM brand_members m JOIN wineries w ON w.id = m.winery_id
      WHERE m.revoked_at IS NULL AND (m.user_id = ${ctx.user.userId ?? -1} OR (${email} <> '' AND LOWER(m.email) = ${email}))
      ORDER BY w.name`);
    for (const c of contracted) {
      if (c.winery_id !== ctx.user.wineryId) brands.push({ wineryId: c.winery_id, name: c.name, role: "contractor" });
    }
    return { email: email || ctx.user.openId, brands };
  }),

  listWines: protectedProcedure.input(brandId).query(async ({ ctx, input }) => {
    const role = await resolveRole(ctx.user, input.wineryId);
    const list = await rows<WineRow>(sql`
      SELECT * FROM brand_wines WHERE winery_id = ${input.wineryId} AND archived_at IS NULL ORDER BY updated_at DESC`);
    return { role, wines: list.map(toWine) };
  }),

  getWine: protectedProcedure.input(brandId.extend({ wineId: z.number().int() })).query(async ({ ctx, input }) => {
    const role = await resolveRole(ctx.user, input.wineryId);
    const wine = toWine(await getWineRow(input.wineryId, input.wineId));
    const logs = await rows<LogRow>(sql`
      SELECT * FROM brand_wine_logs WHERE winery_id = ${input.wineryId} AND wine_id = ${input.wineId} ORDER BY created_at DESC LIMIT 200`);
    if (role === "contractor") {
      const recent = await rows<{ id: number }>(sql`
        SELECT id FROM brand_activity WHERE winery_id = ${input.wineryId} AND actor_email = ${emailOf(ctx.user) || ctx.user.openId}
          AND action = 'viewed' AND target = ${wine.name.slice(0, 300)} AND created_at > ${Date.now() - 10 * 60_000} LIMIT 1`);
      if (!recent.length) await logActivity(ctx.user, input.wineryId, role, "viewed", wine.name);
    }
    return { role, wine, logs: logs.map(toLog) };
  }),

  saveWine: protectedProcedure
    .input(brandId.extend({ wineId: z.number().int().optional(), wine: wineInput }))
    .mutation(async ({ ctx, input }) => {
      await requireOwner(ctx.user, input.wineryId);
      const w = input.wine;
      const now = Date.now();
      let id = input.wineId;
      if (id) {
        await getWineRow(input.wineryId, id);
        await db.execute(sql`
          UPDATE brand_wines SET name = ${w.name}, vintage = ${w.vintage}, style = ${w.style},
            blend_json = ${JSON.stringify(w.blend)}, targets_json = ${JSON.stringify(w.targets)}, regime_json = ${JSON.stringify(w.regime)},
            protocol = ${w.protocol}, tasting_notes = ${w.tastingNotes}, updated_at = ${now}
          WHERE id = ${id} AND winery_id = ${input.wineryId}`);
      } else {
        id = await insertId(sql`
          INSERT INTO brand_wines (winery_id, name, vintage, style, blend_json, targets_json, regime_json, protocol, tasting_notes, created_by_user_id, created_at, updated_at)
          VALUES (${input.wineryId}, ${w.name}, ${w.vintage}, ${w.style}, ${JSON.stringify(w.blend)}, ${JSON.stringify(w.targets)}, ${JSON.stringify(w.regime)},
            ${w.protocol}, ${w.tastingNotes}, ${ctx.user.userId ?? null}, ${now}, ${now})`);
      }
      await logActivity(ctx.user, input.wineryId, "owner", input.wineId ? "edited" : "created", w.name);
      return { id };
    }),

  archiveWine: protectedProcedure.input(brandId.extend({ wineId: z.number().int() })).mutation(async ({ ctx, input }) => {
    await requireOwner(ctx.user, input.wineryId);
    const w = await getWineRow(input.wineryId, input.wineId);
    await db.execute(sql`UPDATE brand_wines SET archived_at = ${Date.now()} WHERE id = ${input.wineId} AND winery_id = ${input.wineryId}`);
    await logActivity(ctx.user, input.wineryId, "owner", "archived", w.name);
    return { ok: true };
  }),

  addLog: protectedProcedure
    .input(brandId.extend({
      wineId: z.number().int(),
      kind: z.enum(["work", "reading", "note"]),
      note: z.string().trim().max(2000).default(""),
      readings: z.object({ brix: short, ph: short, ta: short, so2: short, temp: short }).default({}),
    }))
    .mutation(async ({ ctx, input }) => {
      const role = await resolveRole(ctx.user, input.wineryId);
      const wine = await getWineRow(input.wineryId, input.wineId);
      const readings = Object.fromEntries(Object.entries(input.readings).filter(([, v]) => v && v.trim()));
      if (!input.note && Object.keys(readings).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add a note or at least one reading." });
      }
      await db.execute(sql`
        INSERT INTO brand_wine_logs (winery_id, wine_id, author_user_id, author_email, author_role, kind, note, readings_json, created_at)
        VALUES (${input.wineryId}, ${input.wineId}, ${ctx.user.userId ?? null}, ${emailOf(ctx.user) || ctx.user.openId}, ${role},
          ${input.kind}, ${input.note}, ${JSON.stringify(readings)}, ${Date.now()})`);
      await logActivity(ctx.user, input.wineryId, role, input.kind === "reading" ? "logged reading" : "logged work", wine.name);
      return { ok: true };
    }),

  members: protectedProcedure.input(brandId).query(async ({ ctx, input }) => {
    await requireOwner(ctx.user, input.wineryId);
    const list = await rows<{ id: number; email: string; invited_at: number; accepted_at: number | null; revoked_at: number | null }>(sql`
      SELECT id, email, invited_at, accepted_at, revoked_at FROM brand_members WHERE winery_id = ${input.wineryId} ORDER BY invited_at DESC`);
    return list.map((m) => ({
      id: m.id,
      email: m.email,
      invitedAt: Number(m.invited_at),
      status: m.revoked_at ? "revoked" : m.accepted_at ? "active" : "invited",
    }));
  }),

  invite: protectedProcedure.input(brandId.extend({ email: z.string().trim().toLowerCase().email().max(200) })).mutation(async ({ ctx, input }) => {
    await requireOwner(ctx.user, input.wineryId);
    if (input.email === emailOf(ctx.user)) throw new TRPCError({ code: "BAD_REQUEST", message: "That's your own email." });
    const existing = await rows<{ id: number; revoked_at: number | null }>(sql`
      SELECT id, revoked_at FROM brand_members WHERE winery_id = ${input.wineryId} AND LOWER(email) = ${input.email} LIMIT 1`);
    if (existing[0] && !existing[0].revoked_at) throw new TRPCError({ code: "CONFLICT", message: "That person already has access." });
    const [{ n }] = await rows<{ n: number }>(sql`SELECT COUNT(*) AS n FROM brand_members WHERE winery_id = ${input.wineryId} AND revoked_at IS NULL`);
    if (Number(n) >= MAX_CONTRACTORS) throw new TRPCError({ code: "BAD_REQUEST", message: `Limit of ${MAX_CONTRACTORS} contractors reached.` });
    if (existing[0]) {
      await db.execute(sql`UPDATE brand_members SET revoked_at = NULL, accepted_at = NULL, user_id = NULL, invited_at = ${Date.now()} WHERE id = ${existing[0].id}`);
    } else {
      await db.execute(sql`
        INSERT INTO brand_members (winery_id, email, role, invited_by_user_id, invited_at)
        VALUES (${input.wineryId}, ${input.email}, 'contractor', ${ctx.user.userId ?? null}, ${Date.now()})`);
    }
    const [brand] = await rows<{ name: string }>(sql`SELECT name FROM wineries WHERE id = ${input.wineryId} LIMIT 1`);
    await logActivity(ctx.user, input.wineryId, "owner", "invited", input.email);
    void sendContractorInvite(input.email, brand?.name ?? "A winery", emailOf(ctx.user));
    return { ok: true };
  }),

  revoke: protectedProcedure.input(brandId.extend({ memberId: z.number().int() })).mutation(async ({ ctx, input }) => {
    await requireOwner(ctx.user, input.wineryId);
    const [m] = await rows<{ email: string }>(sql`SELECT email FROM brand_members WHERE id = ${input.memberId} AND winery_id = ${input.wineryId} LIMIT 1`);
    if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Contractor not found" });
    await db.execute(sql`UPDATE brand_members SET revoked_at = ${Date.now()} WHERE id = ${input.memberId} AND winery_id = ${input.wineryId}`);
    await logActivity(ctx.user, input.wineryId, "owner", "revoked", m.email);
    return { ok: true };
  }),

  activity: protectedProcedure.input(brandId).query(async ({ ctx, input }) => {
    await requireOwner(ctx.user, input.wineryId);
    const list = await rows<{ id: number; actor_email: string; actor_role: Role; action: string; target: string; created_at: number }>(sql`
      SELECT id, actor_email, actor_role, action, target, created_at FROM brand_activity
      WHERE winery_id = ${input.wineryId} ORDER BY created_at DESC LIMIT 150`);
    return list.map((a) => ({ id: a.id, actorEmail: a.actor_email, actorRole: a.actor_role, action: a.action, target: a.target, createdAt: Number(a.created_at) }));
  }),

  renameBrand: protectedProcedure
    .input(brandId.extend({ name: z.string().trim().min(2).max(120) }))
    .mutation(async ({ ctx, input }) => {
      await requireOwner(ctx.user, input.wineryId);
      const [old] = await rows<{ name: string }>(sql`SELECT name FROM wineries WHERE id = ${input.wineryId} LIMIT 1`);
      await db.execute(sql`UPDATE wineries SET name = ${input.name} WHERE id = ${input.wineryId}`);
      await logActivity(ctx.user, input.wineryId, "owner", "renamed brand", `${old?.name ?? ""} → ${input.name}`);
      return { name: input.name };
    }),

  exportVault: protectedProcedure.input(brandId).mutation(async ({ ctx, input }) => {
    await requireOwner(ctx.user, input.wineryId);
    const [brand] = await rows<{ name: string }>(sql`SELECT name FROM wineries WHERE id = ${input.wineryId} LIMIT 1`);
    const wines = (await rows<WineRow>(sql`SELECT * FROM brand_wines WHERE winery_id = ${input.wineryId} AND archived_at IS NULL`)).map(toWine);
    const logs = await rows<LogRow & { wine_id: number }>(sql`SELECT * FROM brand_wine_logs WHERE winery_id = ${input.wineryId} ORDER BY created_at`);
    await logActivity(ctx.user, input.wineryId, "owner", "exported", `${wines.length} wines`);
    return {
      brand: brand?.name ?? "",
      exportedAt: new Date().toISOString(),
      wines: wines.map((w) => ({ ...w, logs: logs.filter((l) => l.wine_id === w.id).map(toLog) })),
    };
  }),
});
