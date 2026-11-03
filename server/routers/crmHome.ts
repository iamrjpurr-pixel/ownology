// crmHome — the one simple CRM page (/admin/crm): what needs you, the funnel, search, plain-English story per person.
import { z } from "zod";
import { sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";
import { sendCardForContact } from "../outreachCopilot.js";

const DAY = 86_400_000;
const rows = async <T,>(q: ReturnType<typeof sql>) => ((await db.execute(q))[0] as unknown as T[]);
const day = (ms: number) => new Date(ms).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Sydney" });

type C = {
  id: number; slug: string; first_name: string; last_name: string | null; winery: string | null; email: string | null; mobile_au: string | null;
  event: string | null; status: string | null; view_count: number | null; created_at: number; sms_sent_at: number | null; email_sent_at: number | null;
  insta_contacted_at: number | null; linkedin_contacted_at: number | null; facebook_contacted_at: number | null; first_viewed_at: number | null;
  cta_clicked_at: number | null; replied_at: number | null; reply_text: string | null; demo_booked_at: number | null; unsubscribed_at: number | null;
};
const C_COLS = sql.raw(`c.id, c.slug, c.first_name, c.last_name, c.winery, c.email, c.mobile_au, c.event, c.status, c.view_count, c.created_at,
  c.sms_sent_at, c.email_sent_at, c.insta_contacted_at, c.linkedin_contacted_at, c.facebook_contacted_at, c.first_viewed_at,
  c.cta_clicked_at, c.replied_at, c.reply_text, c.demo_booked_at, c.unsubscribed_at`);
const TOUCHED = sql.raw("COALESCE(c.sms_sent_at, c.email_sent_at, c.insta_contacted_at, c.linkedin_contacted_at, c.facebook_contacted_at)");
const ACTIVE = sql.raw("COALESCE(c.status,'cold') NOT IN ('skip') AND c.unsubscribed_at IS NULL");

export type CrmRow = { key: string; contactId: number | null; userId: number | null; name: string; winery: string; line: string; at: number; reason?: string };

const name = (c: C) => [c.first_name, c.last_name].filter(Boolean).join(" ");
const touchedAt = (c: C) => c.sms_sent_at ?? c.email_sent_at ?? c.insta_contacted_at ?? c.linkedin_contacted_at ?? c.facebook_contacted_at;

function contactLine(c: C): string {
  const bits: string[] = [];
  if (c.sms_sent_at) bits.push(`Texted ${day(c.sms_sent_at)}`);
  if (c.email_sent_at) bits.push(`Emailed ${day(c.email_sent_at)}`);
  if (c.insta_contacted_at || c.linkedin_contacted_at || c.facebook_contacted_at) bits.push("Messaged on social");
  if (!touchedAt(c)) bits.push(`Not contacted yet${c.event ? ` · from ${c.event}` : ""}`);
  if (Number(c.view_count) > 0) bits.push(`opened ${c.view_count}×`);
  else if (touchedAt(c)) bits.push("not opened");
  if (c.replied_at) bits.push(`replied ${day(c.replied_at)}`);
  else if (touchedAt(c)) bits.push("no reply");
  if (c.unsubscribed_at) bits.push("unsubscribed");
  if (c.status === "skip") bits.push("not a fit");
  return bits.join(" · ");
}
const toRow = (c: C, reason?: string, at?: number): CrmRow => ({
  key: `c${c.id}`, contactId: c.id, userId: null, name: name(c), winery: c.winery ?? "", line: contactLine(c), at: at ?? touchedAt(c) ?? c.created_at, reason,
});

type U = { id: number; name: string | null; email: string | null; created_at: number; winery: string | null; plan: string | null; last_seen: number | null; wines: number };
const U_SELECT = sql.raw(`SELECT u.id, u.name, u.email, u.created_at, w.name winery, w.plan,
  (SELECT MAX(e.created_at) FROM user_events e WHERE e.user_id = u.id) last_seen,
  (SELECT COUNT(*) FROM brand_wines b WHERE b.winery_id = u.winery_id AND b.archived_at IS NULL) wines
  FROM users u LEFT JOIN wineries w ON w.id = u.winery_id`);
const REAL_USER = sql.raw("u.role <> 'admin' AND COALESCE(u.email,'') NOT LIKE '%@example.com' AND COALESCE(u.email,'') NOT LIKE 'e1test%'");
const userLine = (u: U) => [`Signed up ${day(Number(u.created_at))}`, u.last_seen ? `last seen ${day(Number(u.last_seen))}` : "never came back", `${u.wines} wine${Number(u.wines) === 1 ? "" : "s"} in vault`, u.plan && u.plan !== "free" ? "paying" : "free plan"].join(" · ");
const userRow = (u: U, reason?: string): CrmRow => ({ key: `u${u.id}`, contactId: null, userId: u.id, name: u.name || u.email || `User ${u.id}`, winery: u.winery ?? "", line: userLine(u), at: Number(u.last_seen ?? u.created_at), reason });

const STAGES = ["not_contacted", "contacted", "opened", "replied", "signed_up", "paying"] as const;

async function stageRows(stage: (typeof STAGES)[number]): Promise<CrmRow[]> {
  if (stage === "signed_up" || stage === "paying") {
    const us = await rows<U>(sql`${U_SELECT} WHERE ${REAL_USER} ${stage === "paying" ? sql`AND w.plan IS NOT NULL AND w.plan <> 'free'` : sql``} ORDER BY u.created_at DESC LIMIT 200`);
    return us.map((u) => userRow(u));
  }
  const where = {
    not_contacted: sql`${ACTIVE} AND ${TOUCHED} IS NULL`,
    contacted: sql`${TOUCHED} IS NOT NULL`,
    opened: sql`COALESCE(c.view_count,0) > 0`,
    replied: sql`c.replied_at IS NOT NULL`,
  }[stage];
  const cs = await rows<C>(sql`SELECT ${C_COLS} FROM outreach_contacts c WHERE ${where} ORDER BY COALESCE(${TOUCHED}, c.created_at) DESC LIMIT 300`);
  return cs.map((c) => toRow(c));
}

export const crmHomeRouter = router({
  home: ownerProcedure.query(async () => {
    const now = Date.now();
    const [f] = await rows<Record<string, number>>(sql`SELECT
      (SELECT COUNT(*) FROM outreach_contacts c WHERE ${ACTIVE} AND ${TOUCHED} IS NULL) not_contacted,
      (SELECT COUNT(*) FROM outreach_contacts c WHERE ${TOUCHED} IS NOT NULL) contacted,
      (SELECT COUNT(*) FROM outreach_contacts c WHERE COALESCE(c.view_count,0) > 0) opened,
      (SELECT COUNT(*) FROM outreach_contacts c WHERE c.replied_at IS NOT NULL) replied,
      (SELECT COUNT(*) FROM users u WHERE ${REAL_USER}) signed_up,
      (SELECT COUNT(DISTINCT w.id) FROM wineries w JOIN users u ON u.winery_id = w.id WHERE u.role <> 'admin' AND w.plan IS NOT NULL AND w.plan <> 'free') paying`);
    const funnel = STAGES.map((id) => ({ id, count: Number(f?.[id] ?? 0) }));

    const back = await rows<C & { last_at: number; visits: number }>(sql`SELECT ${C_COLS}, MAX(e.created_at) last_at, COUNT(DISTINCT e.session_id) visits
      FROM user_events e JOIN outreach_contacts c ON c.slug = e.slug WHERE e.created_at > ${now - 3 * DAY}
      GROUP BY ${C_COLS} ORDER BY last_at DESC LIMIT 5`);
    const replied = await rows<C>(sql`SELECT ${C_COLS} FROM outreach_contacts c WHERE c.replied_at > ${now - 30 * DAY} AND COALESCE(c.status,'cold') NOT IN ('skip','sales') ORDER BY c.replied_at DESC LIMIT 5`);
    const stalled = await rows<U>(sql`${U_SELECT} WHERE ${REAL_USER} AND u.created_at > ${now - 60 * DAY} AND (w.plan IS NULL OR w.plan = 'free')
      HAVING last_seen IS NULL OR last_seen < ${now - 2 * DAY} ORDER BY u.created_at DESC LIMIT 4`);
    // Warm = visited in the last 30 days (older interest doesn't count as hot).
    const quiet = await rows<C & { last_seen: number }>(sql`SELECT ${C_COLS}, (SELECT MAX(e.created_at) FROM user_events e WHERE e.slug = c.slug) last_seen
      FROM outreach_contacts c WHERE ${ACTIVE} AND c.replied_at IS NULL AND ${TOUCHED} < ${now - 3 * DAY}
      HAVING last_seen > ${now - 30 * DAY} AND last_seen < ${now - 3 * DAY} ORDER BY last_seen DESC LIMIT 4`);

    const seen = new Set<string>();
    const needsYou: CrmRow[] = [];
    const push = (r: CrmRow) => { if (!seen.has(r.key)) { seen.add(r.key); needsYou.push(r); } };
    back.forEach((c) => push(toRow(c, `Came back ${day(Number(c.last_at))} (${c.visits} visit${Number(c.visits) === 1 ? "" : "s"} in 3 days)`, Number(c.last_at))));
    replied.forEach((c) => push(toRow(c, `Replied ${day(c.replied_at!)}${c.reply_text ? `: "${c.reply_text.slice(0, 120)}"` : ""}`, c.replied_at!)));
    stalled.forEach((u) => push(userRow(u, "Signed up but hasn't been back")));
    quiet.forEach((c) => push(toRow(c, `Warm: last visited ${day(Number(c.last_seen))}, no reply yet`, Number(c.last_seen))));
    return { funnel, needsYou: needsYou.slice(0, 10) };
  }),

  stage: ownerProcedure.input(z.object({ stage: z.enum(STAGES) })).query(({ input }) => stageRows(input.stage)),

  search: ownerProcedure.input(z.object({ q: z.string().trim().min(2).max(80) })).query(async ({ input }) => {
    const like = `%${input.q}%`;
    const cs = await rows<C>(sql`SELECT ${C_COLS} FROM outreach_contacts c WHERE CONCAT_WS(' ', c.first_name, c.last_name, c.winery, c.email, c.region) LIKE ${like} ORDER BY c.created_at DESC LIMIT 25`);
    const us = await rows<U>(sql`${U_SELECT} WHERE ${REAL_USER} AND CONCAT_WS(' ', u.name, u.email, w.name) LIKE ${like} LIMIT 10`);
    return [...cs.map((c) => toRow(c)), ...us.map((u) => userRow(u))];
  }),

  person: ownerProcedure.input(z.object({ contactId: z.number().int().optional(), userId: z.number().int().optional() })).query(async ({ input }) => {
    const story: { at: number; text: string }[] = [];
    let c: C | undefined;
    let userId = input.userId ?? null;
    let contactId = input.contactId ?? null;
    if (!contactId && userId) {
      const [l] = await rows<{ id: number }>(sql`SELECT c.id FROM user_events e JOIN outreach_contacts c ON c.slug = e.slug WHERE e.user_id = ${userId} LIMIT 1`);
      contactId = l?.id ?? null;
    }
    if (contactId) {
      [c] = await rows<C>(sql`SELECT ${C_COLS} FROM outreach_contacts c WHERE c.id = ${contactId}`);
      if (!c) throw new TRPCError({ code: "NOT_FOUND" });
      const add = (at: number | null, text: string) => { if (at) story.push({ at: Number(at), text }); };
      add(c.created_at, `Added to your list${c.event ? ` from ${c.event}` : ""}`);
      add(c.sms_sent_at, "You texted them");
      add(c.email_sent_at, "You emailed them");
      add(c.insta_contacted_at, "You messaged them on Instagram");
      add(c.linkedin_contacted_at, "You messaged them on LinkedIn");
      add(c.facebook_contacted_at, "You messaged them on Facebook");
      add(c.first_viewed_at, "They opened their personal page for the first time");
      add(c.cta_clicked_at, "They clicked the button on their page");
      add(c.replied_at, `They replied${c.reply_text ? `: "${c.reply_text.slice(0, 300)}"` : ""}`);
      add(c.demo_booked_at, "They booked a demo");
      add(c.unsubscribed_at, "They unsubscribed");
      const visits = await rows<{ d: string; n: number; at: number }>(sql`SELECT DATE(FROM_UNIXTIME(created_at/1000)) d, COUNT(*) n, MIN(created_at) at FROM user_events WHERE slug = ${c.slug} GROUP BY d ORDER BY d`);
      visits.forEach((v) => story.push({ at: Number(v.at), text: `Visited the site (${v.n} click${Number(v.n) === 1 ? "" : "s"})` }));
      const cards = await rows<{ created_at: number; acted_at: number | null; status: string; channel: string }>(sql`SELECT created_at, acted_at, status, channel FROM outreach_cards WHERE contact_id = ${c.id} ORDER BY created_at`);
      cards.forEach((k) => story.push({ at: Number(k.acted_at ?? k.created_at), text: `Telegram card (${k.channel}): ${k.status === "sent" ? "sent" : k.status === "pending" ? "waiting for you" : k.status}` }));
      const [linked] = await rows<{ user_id: number }>(sql`SELECT e.user_id FROM user_events e JOIN users u ON u.id = e.user_id WHERE e.slug = ${c.slug} AND u.role <> 'admin' LIMIT 1`);
      userId = userId ?? linked?.user_id ?? null;
    }
    let u: U | undefined;
    if (userId) {
      [u] = await rows<U>(sql`${U_SELECT} WHERE u.id = ${userId}`);
      if (u) {
        story.push({ at: Number(u.created_at), text: `Signed up${u.email ? ` as ${u.email}` : ""}` });
        if (!c) {
          const visits = await rows<{ d: string; n: number; at: number }>(sql`SELECT DATE(FROM_UNIXTIME(created_at/1000)) d, COUNT(*) n, MIN(created_at) at FROM user_events WHERE user_id = ${u.id} GROUP BY d ORDER BY d`);
          visits.forEach((v) => story.push({ at: Number(v.at), text: `Used the site (${v.n} click${Number(v.n) === 1 ? "" : "s"})` }));
        }
      }
    }
    const [watch] = await rows<{ id: number }>(sql`SELECT id FROM member_watches WHERE fired_at IS NULL AND (${c ? sql`slug = ${c.slug}` : sql`FALSE`} OR ${userId ? sql`user_id = ${userId}` : sql`FALSE`}) LIMIT 1`);
    story.sort((a, b) => a.at - b.at);
    return {
      contactId: c?.id ?? null, userId, slug: c?.slug ?? null,
      name: c ? name(c) : u?.name || u?.email || "Unknown", winery: c?.winery ?? u?.winery ?? "",
      email: c?.email ?? u?.email ?? null, mobile: c?.mobile_au ?? null,
      summary: c ? contactLine(c) : u ? userLine(u) : "", wines: u ? Number(u.wines) : null,
      notFit: c?.status === "skip", watching: !!watch, canCard: !!c && !userId && !c.unsubscribed_at && c.status !== "skip" && !!(c.email || c.mobile_au),
      story: story.map((s) => ({ ...s, day: day(s.at) })),
    };
  }),

  sendToTelegram: ownerProcedure.input(z.object({ contactId: z.number().int() })).mutation(async ({ input }) => {
    const ok = await sendCardForContact(input.contactId);
    if (!ok) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Telegram isn't connected on this server" });
    return { ok };
  }),

  watch: ownerProcedure.input(z.object({ contactId: z.number().int().optional(), userId: z.number().int().optional() })).mutation(async ({ input }) => {
    let slug: string | null = null, label = "";
    if (input.contactId) {
      const [c] = await rows<{ slug: string; first_name: string; last_name: string | null; winery: string | null }>(sql`SELECT slug, first_name, last_name, winery FROM outreach_contacts WHERE id = ${input.contactId}`);
      if (!c) throw new TRPCError({ code: "NOT_FOUND" });
      slug = c.slug; label = `${[c.first_name, c.last_name].filter(Boolean).join(" ")}${c.winery ? ` (${c.winery})` : ""}`;
    }
    if (input.userId && !label) {
      const [u] = await rows<{ name: string | null; email: string | null }>(sql`SELECT name, email FROM users WHERE id = ${input.userId}`);
      label = u?.name || u?.email || `User ${input.userId}`;
    }
    if (!slug && !input.userId) throw new TRPCError({ code: "BAD_REQUEST" });
    await db.execute(sql`INSERT INTO member_watches (user_id, slug, tag, label, created_at) VALUES (${input.userId ?? null}, ${slug}, NULL, ${label}, ${Date.now()})`);
    return { ok: true };
  }),

  notFit: ownerProcedure.input(z.object({ contactId: z.number().int() })).mutation(async ({ input }) => {
    await db.execute(sql`UPDATE outreach_contacts SET status = 'skip' WHERE id = ${input.contactId}`);
    return { ok: true };
  }),
});
