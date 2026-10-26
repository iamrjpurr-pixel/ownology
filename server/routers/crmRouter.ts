/**
 * crmRouter — "one person, one card". Merges every table that holds a
 * prospect or customer (matched by lower-cased email, or outreach slug when
 * there's no email) into a single list for /admin/people. Owner-only, read-only.
 */
import { sql } from "drizzle-orm";
import { router, ownerProcedure } from "../trpc.js";
import { db } from "../db.js";
import { isTestEmail } from "../../shared/testEmails.js";

async function rows<T>(q: ReturnType<typeof sql>): Promise<T[]> {
  const [res] = await db.execute(q);
  return res as unknown as T[];
}

export type CrmKind = "contact" | "lead" | "quiz" | "demo" | "survey" | "reservation" | "member" | "access" | "referral" | "account";

export type CrmRecord = { kind: CrmKind; at: number; summary: string; id?: number; status?: string };

export type CrmPerson = {
  key: string;
  email: string | null;
  name: string;
  winery: string;
  slug: string | null;
  userId: number | null;
  kinds: CrmKind[];
  reservation: { id: number; status: string } | null;
  otherEmails: string[];
  lastAt: number;
  records: CrmRecord[];
};

const n = (v: unknown) => Number(v ?? 0);
const fmtName = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" ").trim();

export const crmRouter = router({
  people: ownerProcedure.query(async (): Promise<CrmPerson[]> => {
    const map = new Map<string, CrmPerson>();
    const slugKey = new Map<string, string>();

    const add = (rawEmail: string | null | undefined, fallbackKey: string | null, rec: CrmRecord, who: { name?: string | null; winery?: string | null } = {}) => {
      const email = rawEmail?.trim().toLowerCase() || null;
      if (email && isTestEmail(email)) return null;
      const key = email ?? fallbackKey;
      if (!key) return null;
      let p = map.get(key);
      if (!p) {
        p = { key, email, name: "", winery: "", slug: null, userId: null, kinds: [], reservation: null, otherEmails: [], lastAt: 0, records: [] };
        map.set(key, p);
      }
      if (!p.name && who.name) p.name = who.name;
      if (!p.winery && who.winery) p.winery = who.winery;
      if (!p.kinds.includes(rec.kind)) p.kinds.push(rec.kind);
      p.records.push(rec);
      p.lastAt = Math.max(p.lastAt, rec.at);
      return p;
    };

    const contacts = await rows<{ id: number; slug: string; first_name: string; last_name: string | null; email: string | null; winery: string | null; status: string | null; created_at: number; view_count: number | null; first_viewed_at: number | null; sms_sent_at: number | null; email_sent_at: number | null; replied_at: number | null; demo_booked_at: number | null }>(sql`
      SELECT id, slug, first_name, last_name, email, winery, status, created_at, view_count, first_viewed_at, sms_sent_at, email_sent_at, replied_at, demo_booked_at FROM outreach_contacts`);
    for (const c of contacts) {
      const at = Math.max(n(c.created_at), n(c.first_viewed_at), n(c.sms_sent_at), n(c.email_sent_at), n(c.replied_at), n(c.demo_booked_at));
      const bits = [c.status || "cold", c.sms_sent_at && "texted", c.email_sent_at && "emailed", n(c.view_count) > 0 && `opened link ${n(c.view_count)}×`, c.replied_at && "replied", c.demo_booked_at && "booked demo"].filter(Boolean);
      const p = add(c.email, `slug:${c.slug}`, { kind: "contact", at, id: n(c.id), status: c.status ?? "cold", summary: `Outreach contact · ${bits.join(" · ")}` }, { name: fmtName(c.first_name, c.last_name), winery: c.winery });
      if (p) { p.slug = c.slug; slugKey.set(c.slug, p.key); }
    }

    const survey = await rows<{ slug: string; answers: number; visits: number; at: number }>(sql`
      SELECT s.slug, COUNT(DISTINCT s.question_id) AS answers, COUNT(DISTINCT s.session_id) AS visits, MAX(s.created_at) AS at FROM (
        SELECT COALESCE(sa.slug, (SELECT e.slug FROM user_events e WHERE e.session_id = sa.session_id AND e.slug IS NOT NULL LIMIT 1)) AS slug, sa.question_id, sa.session_id, sa.created_at
        FROM survey_answers sa) s
      WHERE s.slug IS NOT NULL GROUP BY s.slug`).catch((err) => { console.error("[crm.people] survey merge failed:", err); return []; });
    for (const s of survey) {
      const key = slugKey.get(s.slug);
      const p = key ? map.get(key) : null;
      if (p) add(p.email, p.key, { kind: "survey", at: n(s.at), summary: `Answered ${n(s.answers)} of 8 survey questions${n(s.visits) > 1 ? ` over ${n(s.visits)} visits` : ""}` });
    }

    for (const l of await rows<{ id: number; email: string; name: string | null; winery_name: string | null; source: string | null; stripe_paid: number | null; created_at: number }>(sql`
      SELECT id, email, name, winery_name, source, stripe_paid, created_at FROM leads`))
      add(l.email, null, { kind: "lead", at: n(l.created_at), id: n(l.id), summary: `Signed up via ${l.source || "website"}${l.stripe_paid ? " · paid" : ""}` }, { name: l.name, winery: l.winery_name });

    for (const q of await rows<{ email: string | null; first_name: string | null; winery: string | null; winner_slug: string | null; captured_at: number }>(sql`
      SELECT email, first_name, winery, winner_slug, captured_at FROM quiz_leads`))
      add(q.email, null, { kind: "quiz", at: n(q.captured_at), summary: `Took the quiz${q.winner_slug ? ` · matched ${q.winner_slug}` : ""}` }, { name: q.first_name, winery: q.winery });

    for (const d of await rows<{ email: string | null; at: number; n: number }>(sql`
      SELECT email, MAX(created_at) AS at, COUNT(*) AS n FROM demo_submissions WHERE email IS NOT NULL AND email <> '' GROUP BY email`))
      add(d.email, null, { kind: "demo", at: n(d.at), summary: `Tried the demo cellar log ${n(d.n)}×` });

    for (const r of await rows<{ id: number; email: string; name: string; winery_name: string; tier: string; cycle: string; status: string; reserved_at: number }>(sql`
      SELECT id, email, name, winery_name, tier, cycle, status, reserved_at FROM founding_reservations`)) {
      const p = add(r.email, null, { kind: "reservation", at: n(r.reserved_at), id: n(r.id), status: r.status, summary: `Reserved a founding slot · ${r.tier} ${r.cycle} · ${r.status}` }, { name: r.name, winery: r.winery_name });
      if (p && (!p.reservation || r.id > p.reservation.id)) p.reservation = { id: n(r.id), status: r.status };
    }

    for (const m of await rows<{ id: number; email: string; name: string | null; winery_name: string | null; tier: string; joined_at: number }>(sql`
      SELECT id, email, name, winery_name, tier, joined_at FROM founding_members`))
      add(m.email, null, { kind: "member", at: n(m.joined_at), id: n(m.id), summary: `Paying founding member · ${m.tier}` }, { name: m.name, winery: m.winery_name });

    for (const g of await rows<{ id: number; contact_email: string | null; member_name: string | null; winery_name: string | null; tier: string | null; created_at: number; last_used_at: number | null; revoked_at: number | null }>(sql`
      SELECT id, contact_email, member_name, winery_name, tier, created_at, last_used_at, revoked_at FROM gate_invites WHERE contact_email IS NOT NULL AND contact_email <> ''`))
      add(g.contact_email, null, { kind: "access", at: Math.max(n(g.created_at), n(g.last_used_at)), id: n(g.id), summary: `Access link (${g.tier || "gate"})${g.revoked_at ? " · revoked" : g.last_used_at ? " · used" : " · not used yet"}` }, { name: g.member_name, winery: g.winery_name });

    for (const r of await rows<{ referred_email: string | null; status: string; created_at: number }>(sql`
      SELECT referred_email, status, created_at FROM referrals WHERE referred_email IS NOT NULL AND referred_email <> ''`))
      add(r.referred_email, null, { kind: "referral", at: n(r.created_at), status: r.status, summary: `Referred by another winery · ${r.status.replace("_", " ")}` });

    // An account opened from a personal link joins that contact's card, even under a different email.
    const userSlug = new Map<number, string>();
    for (const r of await rows<{ user_id: number; slug: string }>(sql`
      SELECT user_id, MIN(slug) AS slug FROM user_events WHERE user_id IS NOT NULL AND slug IS NOT NULL GROUP BY user_id`))
      userSlug.set(n(r.user_id), r.slug);

    for (const u of await rows<{ id: number; email: string | null; name: string | null; created_at: number }>(sql`
      SELECT id, email, name, created_at FROM users WHERE email IS NOT NULL AND open_id NOT LIKE 'e1test-%'`)) {
      const email = u.email!.trim().toLowerCase();
      const linkedKey = slugKey.get(userSlug.get(n(u.id)) ?? "");
      const rec: CrmRecord = { kind: "account", at: n(u.created_at), id: n(u.id), summary: linkedKey && email !== map.get(linkedKey)?.email ? `Has an Ownology account · ${email} (signed up from their personal link)` : "Has an Ownology account" };
      const p = linkedKey && !isTestEmail(email) ? add(map.get(linkedKey)!.email, linkedKey, rec) : add(email, null, rec, { name: u.name });
      if (!p) continue;
      p.userId = n(u.id);
      if (email !== p.email && !p.otherEmails.includes(email)) p.otherEmails.push(email);
    }

    return [...map.values()]
      .map((p) => ({ ...p, name: p.name || p.email || p.slug || "Unknown", records: p.records.sort((a, b) => b.at - a.at) }))
      .sort((a, b) => b.lastAt - a.lastAt);
  }),
});
