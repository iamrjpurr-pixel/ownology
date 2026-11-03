// Outreach copilot: daily prospect cards in Telegram with one-tap send / skip / later / not-a-fit.
import type { Express, Request, Response } from "express";
import express from "express";
import { createHmac } from "crypto";
import { Resend } from "resend";
import { sql } from "drizzle-orm";
import { db } from "./db.js";
import { chatCompletion, MODELS } from "./_core/llm.js";
import { tg, operatorChatId, sendOperatorTelegram, telegramWebhookSecret, type TgButton } from "./telegram.js";
import { evaluateCronSecret } from "./scheduled/_cronSecret.js";
import { replyAddress } from "./inboundReplies.js";
import { buildWaHref } from "./routers/outreach-helpers.js";
import { smsEnabled, sendSms, auMobile } from "./sms.js";

const PROD_URL = (process.env.OWNOLOGY_PROD_URL || "https://www.ownology.ai").replace(/\/$/, "");
const DAY = 24 * 60 * 60 * 1000;
const DAILY_CARDS = 5;
const SEND_HOUR_SYD = 7.5;
const FROM = "Rich & Gel · Ownology <support@ownology.ai>";
const REPLY_TO = ["support@ownology.ai", "iamrjpurr@gmail.com"];

type Contact = {
  id: number; slug: string; first_name: string; winery: string | null; email: string | null; mobile_au: string | null;
  hook_text: string | null; pain_point: string | null; event: string | null; region: string | null; view_count: number;
};
type AutoKind = "auto1" | "auto2" | "revive";
type Card = { id: number; contact_id: number; kind: "first" | "followup" | "reply" | AutoKind; channel: "email" | "sms"; subject: string | null; body: string; status: string };

const rows = async <T,>(q: ReturnType<typeof sql>) => ((await db.execute(q))[0] as unknown as T[]);
const sign = (v: string) => createHmac("sha256", process.env.JWT_SECRET || process.env.TELEGRAM_BOT_TOKEN || "ow").update(v).digest("hex").slice(0, 24);
const pageUrl = (c: Contact) => `${PROD_URL}/hi/${c.slug}`;
const unsubUrl = (c: Contact) => `${PROD_URL}/api/outreach/unsubscribe?c=${encodeURIComponent(c.slug)}&t=${sign(`unsub:${c.slug}`)}`;
const sydney = (ms = Date.now()) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 + Number(p.minute) / 60, weekday: p.weekday };
};

const TOUCHED = sql.raw("COALESCE(c.sms_sent_at, c.email_sent_at, c.insta_contacted_at, c.linkedin_contacted_at, c.facebook_contacted_at)");
const BASE_FILTER = sql.raw(`c.unsubscribed_at IS NULL AND COALESCE(c.status,'cold') NOT IN ('skip','sales') AND c.replied_at IS NULL
  AND ((c.email IS NOT NULL AND c.email <> '') OR (c.mobile_au IS NOT NULL AND c.mobile_au <> ''))
  AND NOT EXISTS (SELECT 1 FROM user_events se JOIN users su ON su.id = se.user_id WHERE se.slug = c.slug AND su.role <> 'admin')`);
const COLS = sql.raw("c.id, c.slug, c.first_name, c.winery, c.email, c.mobile_au, c.hook_text, c.pain_point, c.event, c.region, COALESCE(c.view_count,0) view_count");

export async function pickContacts(n: number): Promise<{ contact: Contact; kind: Card["kind"] }[]> {
  const now = Date.now();
  const followups = smsEnabled() ? [] : await rows<Contact>(sql`SELECT ${COLS} FROM outreach_contacts c
    WHERE ${BASE_FILTER} AND (c.email IS NULL OR c.email = '') AND ${TOUCHED} IS NOT NULL AND ${TOUCHED} < ${now - 3 * DAY} AND COALESCE(c.view_count,0) > 0
      AND NOT EXISTS (SELECT 1 FROM outreach_cards k WHERE k.contact_id = c.id AND (k.kind = 'followup' AND k.status IN ('sent','pending','skipped','unfit') OR k.created_at > ${now - 7 * DAY}))
    ORDER BY c.view_count DESC LIMIT ${n}`);
  const fresh = followups.length >= n ? [] : await rows<Contact>(sql`SELECT ${COLS} FROM outreach_contacts c
    WHERE ${BASE_FILTER} AND ${TOUCHED} IS NULL ${smsEnabled() ? sql`AND c.email IS NOT NULL AND c.email <> ''` : sql``}
      AND NOT EXISTS (SELECT 1 FROM outreach_cards k WHERE k.contact_id = c.id AND (k.status <> 'later' OR k.created_at > ${now - 7 * DAY}))
    ORDER BY (c.hook_text IS NOT NULL AND c.hook_text <> '') DESC, (c.email IS NOT NULL AND c.email <> '') DESC, c.created_at ASC LIMIT ${n - followups.length}`);
  return [...followups.map((contact) => ({ contact, kind: "followup" as const })), ...fresh.map((contact) => ({ contact, kind: "first" as const }))];
}

function fallbackDraft(c: Contact, kind: Card["kind"], channel: Card["channel"]): { subject: string; body: string } {
  const w = c.winery ? ` at ${c.winery}` : "";
  if (channel === "sms") {
    return { subject: "", body: kind === "followup"
      ? `Hi ${c.first_name}, Rich from Ownology. Saw you had a look at the page I made for you${w}. Happy to answer anything, or set it up with your wines for you: {URL}`
      : `Hi ${c.first_name}${w}, Rich here. I've built Ownology, a quality and brand record for boutique winemakers. Made a 90-second page just for you: {URL}` };
  }
  if (kind === "auto2") return { subject: `${c.first_name}, closing the loop`, body: `G'day ${c.first_name},\n\nWe'll leave it here so we're not clogging your inbox. If keeping your wines' specs, blends and vintage notes in one place ever becomes a priority${w}, the page is still yours:\n\n{URL}\n\nAll the best with the season.\n\nCheers,\nRich & Gel` };
  return kind !== "first"
    ? { subject: `${c.first_name}, quick follow-up`, body: `G'day ${c.first_name},\n\nWe noticed you had a look at the page we put together for you${w}. Thanks for taking the time.\n\nIf it's useful, we can load your current wines into a Brand Vault for you, so you can see it working with your own labels rather than samples. It takes us about 10 minutes.\n\n{URL}\n\nJust reply with any questions.\n\nCheers,\nRich & Gel` }
    : { subject: `${c.first_name}${w}, a small idea`, body: `G'day ${c.first_name},\n\nWe've been building Ownology: one place for a winery's specs, blends, vintage notes and quality records, so they stay with the brand year after year.\n\nWe made a 90-second page for you${w}:\n\n{URL}\n\nIf it's not a fit, no worries at all.\n\nCheers,\nRich & Gel` };
}

export async function draftMessage(c: Contact, kind: Card["kind"], channel: Card["channel"], situation?: string): Promise<{ subject: string; body: string }> {
  const facts = [`First name: ${c.first_name}`, c.winery && `Winery: ${c.winery}`, c.region && `Region: ${c.region}`, c.event && `Where we found them: ${c.event}`,
    c.hook_text && `Personal hook (something they said/posted): ${c.hook_text}`, c.pain_point && `Likely pain point: ${c.pain_point}`,
    kind === "followup" && `They were texted/emailed before and opened their personal page ${c.view_count} time(s) but never replied.`, situation && `Situation: ${situation}`].filter(Boolean).join("\n");
  const rules = channel === "sms"
    ? "Write ONE SMS, max 200 characters, no emojis, say it is from Rich at Ownology. Must include the literal token {URL} once. Do not add sign-off phone numbers or opt-out text."
    : "Write a short plain email (60-120 words), 2-4 short paragraphs, write as 'we' (Rich & Gel), sign off 'Cheers,\\nRich & Gel'. Start with \"G'day <first name>,\". Must include the literal token {URL} on its own line. Subject max 60 chars, specific, no clickbait.";
  try {
    const raw = await chatCompletion([
      { role: "system", content: `You write cold outreach for Rich & Gel, the Australian founders of Ownology (a Brand Vault + quality record + 'Ask Owen' AI for boutique Australian winemakers; contract winemakers can be given controlled access). Tone: warm, plain Australian English, peer-to-peer, honest, zero hype, never pushy. They have NOT met these people: never say "good to meet you", "we met", "great chatting" or similar. If an event is given, be coy: say "we crossed paths at <event>" and that you wanted to share an idea you didn't get to mention then (e.g. "We crossed paths at <event> and we never got to share an idea with you"). Don't claim you talked, and don't say it was busy. Don't quote their own words back at them verbatim; refer to the idea lightly. ${situation ? "Follow the Situation exactly; keep it shorter than a first email." : kind === "followup" ? "This is a gentle follow-up; acknowledge they had a look, offer to load their wines into a vault for them." : "This is a first touch; reference the personal hook naturally if given."} ${rules} Return JSON: {"subject": string, "body": string}.` },
      { role: "user", content: facts },
    ], { model: MODELS.CHEAP, json: true, maxTokens: 600, temperature: 0.7, source: "outreach-copilot" });
    const j = JSON.parse(raw) as { subject?: string; body?: string };
    if (j.body && j.body.includes("{URL}")) return { subject: (j.subject ?? "").slice(0, 120), body: j.body.slice(0, channel === "sms" ? 320 : 2000) };
  } catch (err) {
    console.error("[copilot] draft failed, using fallback:", err);
  }
  return fallbackDraft(c, kind, channel);
}

const smsUrl = (c: Contact) => `${PROD_URL.replace("://www.", "://")}/hi/${c.slug}`;
export const smsText = (c: Contact, body: string) => {
  const b = body.replace("{URL}", smsUrl(c));
  return `${b}${/ownology/i.test(b) ? "" : " - Rich, Ownology"}\nReply STOP to opt out`;
};

function cardText(c: Contact, k: Card, footer?: string): string {
  if (k.kind === "reply") return [`📥 REPLY to ${c.first_name}${c.winery ? ` — ${c.winery}` : ""}`, "———", `Subject: ${k.subject}\n\n${k.body}`, footer && `———\n${footer}`].filter(Boolean).join("\n\n").slice(0, 4000);
  const head = `${k.kind === "followup" ? "🔁 FOLLOW-UP" : "🆕 NEW"} · ${k.channel === "email" ? "✉️ Email" : "📱 SMS"}\n${c.first_name}${c.winery ? ` — ${c.winery}` : ""}${c.region ? ` (${c.region})` : ""}`;
  const why = [c.hook_text && `Hook: ${c.hook_text}`, c.event && `Source: ${c.event}`, k.kind === "followup" && `Opened their page ${c.view_count}×, no reply yet`].filter(Boolean).join("\n");
  const msg = k.channel === "email" ? `Subject: ${k.subject}\n\n${k.body.replace("{URL}", pageUrl(c))}` : smsText(c, k.body);
  return [head, why, "———", msg, footer && `———\n${footer}`].filter(Boolean).join("\n\n").slice(0, 4000);
}

function cardButtons(k: Card): TgButton[][] {
  const main: TgButton[] = k.channel === "email"
    ? [{ text: "✉️ Send email", callback_data: `oc:send:${k.id}` }]
    : smsEnabled() ? [{ text: "📱 Send text", callback_data: `oc:send:${k.id}` }]
    : [{ text: "📱 Open Messages", url: `${PROD_URL}/api/outreach/sms/${k.id}?t=${sign(`sms:${k.id}`)}` }, { text: "✅ I sent it", callback_data: `oc:sent:${k.id}` }];
  return [main, [{ text: "⏭ Skip", callback_data: `oc:skip:${k.id}` }, { text: "💤 Later", callback_data: `oc:later:${k.id}` }, { text: "🚫 Not a fit", callback_data: `oc:unfit:${k.id}` }]];
}

async function sendCard(contact: Contact, kind: Card["kind"]): Promise<boolean> {
  const channel: Card["channel"] = contact.email ? "email" : "sms";
  const d = await draftMessage(contact, kind, channel);
  const [ins] = await db.execute(sql`INSERT INTO outreach_cards (contact_id, kind, channel, subject, body, status, created_at)
    VALUES (${contact.id}, ${kind}, ${channel}, ${d.subject || null}, ${d.body}, 'pending', ${Date.now()})`);
  const card: Card = { id: (ins as unknown as { insertId: number }).insertId, contact_id: contact.id, kind, channel, subject: d.subject, body: d.body, status: "pending" };
  const messageId = await sendOperatorTelegram(cardText(contact, card), cardButtons(card));
  if (messageId) await db.execute(sql`UPDATE outreach_cards SET telegram_message_id = ${messageId} WHERE id = ${card.id}`);
  return !!messageId;
}

export async function createAndSendCards(n: number): Promise<number> {
  let sent = 0;
  for (const { contact, kind } of await pickContacts(n)) if (await sendCard(contact, kind)) sent++;
  return sent;
}

// On-demand card from the CRM page.
export async function sendCardForContact(contactId: number): Promise<boolean> {
  const [contact] = await rows<Contact & { touched: number | null }>(sql`SELECT ${COLS}, ${TOUCHED} touched FROM outreach_contacts c WHERE c.id = ${contactId}`);
  if (!contact) throw new Error("Contact not found");
  if (!contact.email && !contact.mobile_au) throw new Error("No email or mobile on file");
  return sendCard(contact, contact.touched ? "followup" : "first");
}

export const SITUATION: Record<AutoKind, (opened: boolean) => string> = {
  revive: () => "We contacted them months ago and they went quiet. Send ONE fresh, very short 'still on your radar?' note; don't guilt them; mention we can load their wines into a vault for them so they see it with their own labels.",
  auto1: (opened) => opened
    ? "4 days ago we emailed/texted them and they opened their personal page since, but didn't reply. Short, friendly nudge: ask one simple question about how they keep wine specs/blend records today, and offer a 15-minute walkthrough."
    : "4 days ago we emailed/texted them and they haven't opened it. Very short, casual bump (2-3 sentences); assume they're busy with vintage.",
  auto2: () => "Final message in the sequence, a week after the last nudge. Polite 'closing the loop' note: we won't keep emailing; the page stays theirs if it's ever useful. No pressure, warm sign-off.",
};

type AutoCandidate = Contact & { touched: number; revive_at: number | null; a1: number | null; a2: number | null; last_seen: number | null };

// Automatic email sequence: revive (stale >30d) -> day 4 -> day 11. Stops on reply / sign-up / unsubscribe / not a fit.
export async function pickAutoFollowups(cap: number, now = Date.now()): Promise<{ contact: Contact; kind: AutoKind; opened: boolean }[]> {
  const cs = await rows<AutoCandidate>(sql`SELECT ${COLS}, ${TOUCHED} touched,
      (SELECT MAX(k.acted_at) FROM outreach_cards k WHERE k.contact_id = c.id AND k.kind = 'revive' AND k.status = 'sent') revive_at,
      (SELECT MAX(k.acted_at) FROM outreach_cards k WHERE k.contact_id = c.id AND k.kind = 'auto1' AND k.status = 'sent') a1,
      (SELECT MAX(k.acted_at) FROM outreach_cards k WHERE k.contact_id = c.id AND k.kind = 'auto2' AND k.status = 'sent') a2,
      (SELECT MAX(e.created_at) FROM user_events e WHERE e.slug = c.slug) last_seen
    FROM outreach_contacts c
    WHERE ${BASE_FILTER} AND ((c.email IS NOT NULL AND c.email <> '') OR ${sql.raw(smsEnabled() ? "(c.mobile_au IS NOT NULL AND c.mobile_au <> '')" : "FALSE")}) AND ${TOUCHED} IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM outreach_cards k WHERE k.contact_id = c.id AND k.status IN ('pending','queued'))`);
  const out: { contact: Contact; kind: AutoKind; opened: boolean; order: number }[] = [];
  for (const c of cs) {
    if (c.a2) continue;
    const touched = Number(c.touched), revive = c.revive_at ? Number(c.revive_at) : null, a1 = c.a1 ? Number(c.a1) : null;
    const anchor = revive ?? touched;
    const opened = !!c.last_seen && Number(c.last_seen) > anchor;
    if (!a1 && !revive && now - touched > 30 * DAY) out.push({ contact: c, kind: "revive", opened, order: 2 });
    else if (!a1 && now - anchor >= 4 * DAY) out.push({ contact: c, kind: "auto1", opened, order: 0 });
    else if (a1 && now - a1 >= 7 * DAY) out.push({ contact: c, kind: "auto2", opened, order: 1 });
  }
  return out.sort((a, b) => a.order - b.order).slice(0, cap).map(({ order: _o, ...r }) => r);
}


// Mobile-only prospects who've never been contacted get their first text automatically.
export async function pickAutoFirstTexts(cap: number, now = Date.now()): Promise<{ contact: Contact; kind: "first"; opened: boolean }[]> {
  if (!smsEnabled()) return [];
  const cs = await rows<Contact>(sql`SELECT ${COLS} FROM outreach_contacts c
    WHERE ${BASE_FILTER} AND ${TOUCHED} IS NULL AND (c.email IS NULL OR c.email = '') AND c.mobile_au IS NOT NULL AND c.mobile_au <> ''
      AND NOT EXISTS (SELECT 1 FROM outreach_cards k WHERE k.contact_id = c.id AND (k.status <> 'later' OR k.created_at > ${now - 7 * DAY}))
    ORDER BY (c.hook_text IS NOT NULL AND c.hook_text <> '') DESC, c.created_at ASC LIMIT ${cap * 3}`);
  return cs.filter((c) => auMobile(c.mobile_au)).slice(0, cap).map((contact) => ({ contact, kind: "first" as const, opened: false }));
}

// Never-contacted prospects with an email get their first email automatically.
export async function pickAutoFirstEmails(cap: number, now = Date.now()): Promise<{ contact: Contact; kind: "first"; opened: boolean }[]> {
  const cs = await rows<Contact>(sql`SELECT ${COLS} FROM outreach_contacts c
    WHERE ${BASE_FILTER} AND ${TOUCHED} IS NULL AND c.email IS NOT NULL AND c.email <> ''
      AND NOT EXISTS (SELECT 1 FROM outreach_cards k WHERE k.contact_id = c.id AND (k.status <> 'later' OR k.created_at > ${now - 7 * DAY}))
    ORDER BY (c.hook_text IS NOT NULL AND c.hook_text <> '') DESC, c.created_at ASC LIMIT ${cap}`);
  return cs.map((contact) => ({ contact, kind: "first" as const, opened: false }));
}

// Ramp: week 1 small batches, week 2 medium, then full speed (protects number + domain reputation).
async function dailyCaps(): Promise<{ follow: number; texts: number; emails: number }> {
  await db.execute(sql`INSERT IGNORE INTO operator_settings (name, value, updated_at) VALUES ('auto_ramp_start', ${String(Date.now())}, ${Date.now()})`);
  const [r] = await rows<{ value: string }>(sql`SELECT value FROM operator_settings WHERE name = 'auto_ramp_start'`);
  const days = (Date.now() - Number(r?.value ?? Date.now())) / DAY;
  return days < 7 ? { follow: 10, texts: 8, emails: 10 } : days < 14 ? { follow: 15, texts: 15, emails: 15 } : { follow: 25, texts: 25, emails: 25 };
}

const AUTO_LABEL: Record<AutoKind | "first", string> = { first: "first text", revive: "fresh nudge", auto1: "day-4 follow-up", auto2: "final note" };

const PREVIEW_MINUTES = 30;

// Step 1 (7:00am): draft today's automatic messages as 'queued' cards and preview them in Telegram.
export async function prepareAutoBatch(): Promise<number> {
  const caps = await dailyCaps();
  const picks: { contact: Contact; kind: AutoKind | "first"; opened: boolean }[] = [
    ...(await pickAutoFollowups(caps.follow)), ...(await pickAutoFirstTexts(caps.texts)), ...(await pickAutoFirstEmails(caps.emails)),
  ];
  const used = new Set<string>();
  const lines: string[] = [];
  for (const { contact, kind, opened } of picks) {
    const channel: Card["channel"] = contact.email ? "email" : "sms";
    const address = (channel === "email" ? contact.email! : auMobile(contact.mobile_au) ?? "").toLowerCase();
    if (!address || used.has(address)) continue;
    used.add(address);
    try {
      const d = await draftMessage(contact, kind, channel, kind === "first" ? undefined : SITUATION[kind](opened));
      const [ins] = await db.execute(sql`INSERT INTO outreach_cards (contact_id, kind, channel, subject, body, status, created_at)
        VALUES (${contact.id}, ${kind}, ${channel}, ${d.subject || null}, ${d.body}, 'queued', ${Date.now()})`);
      const id = (ins as unknown as { insertId: number }).insertId;
      const text = channel === "sms" ? smsText(contact, d.body) : `Subject: ${d.subject}\n${d.body.replace("{URL}", pageUrl(contact))}`;
      lines.push(`#${id} ${channel === "email" ? "✉️" : "📱"} ${contact.first_name}${contact.winery ? ` (${contact.winery})` : ""} · ${AUTO_LABEL[kind]}\n${text}`);
    } catch (err) {
      console.error(`[copilot] draft ${kind} for ${contact.slug} failed:`, err);
    }
  }
  if (!lines.length) return 0;
  const at = new Date(Date.now() + PREVIEW_MINUTES * 60_000).toLocaleTimeString("en-AU", { timeZone: "Australia/Sydney", hour: "numeric", minute: "2-digit" });
  await sendOperatorTelegram(`👀 ${lines.length} automatic messages go out at ${at}.\nTo drop some, reply e.g. /remove 123 456 (the # numbers). To stop them all, tap Hold.`);
  let chunk = "";
  for (const l of lines) {
    if (chunk.length + l.length > 3500) { await sendOperatorTelegram(chunk); chunk = ""; }
    chunk += `${l}\n\n———\n\n`;
  }
  if (chunk) await sendOperatorTelegram(chunk);
  await sendOperatorTelegram(`Sending at ${at} unless you hold them.`, [[{ text: "⏸ Hold all", callback_data: "oc:hold:0" }, { text: "▶️ Send now", callback_data: "oc:release:0" }]]);
  return lines.length;
}

const holdDate = async () => (await rows<{ value: string }>(sql`SELECT value FROM operator_settings WHERE name = 'copilot_hold'`))[0]?.value ?? "";
export async function setHold(on: boolean) {
  await db.execute(sql`INSERT INTO operator_settings (name, value, updated_at) VALUES ('copilot_hold', ${on ? sydney().date : ""}, ${Date.now()})
    ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)`);
}

// Step 2: send queued cards once the preview window has passed (or immediately when released).
export async function sendDueQueued(immediate = false): Promise<string[]> {
  if (!immediate && (await holdDate()) === sydney().date) return [];
  const cutoff = immediate ? Date.now() : Date.now() - PREVIEW_MINUTES * 60_000;
  const due = await rows<Card>(sql`SELECT id, contact_id, kind, channel, subject, body, status FROM outreach_cards WHERE status = 'queued' AND created_at <= ${cutoff} ORDER BY id`);
  const sent: string[] = [];
  for (const card of due) {
    const [claim] = await db.execute(sql`UPDATE outreach_cards SET status = 'sending' WHERE id = ${card.id} AND status = 'queued'`);
    if ((claim as unknown as { affectedRows: number }).affectedRows !== 1) continue;
    const [contact] = await rows<Contact & { ok: number }>(sql`SELECT ${COLS}, (${BASE_FILTER}) ok FROM outreach_contacts c WHERE c.id = ${card.contact_id}`);
    if (!contact || !Number(contact.ok)) { await db.execute(sql`UPDATE outreach_cards SET status = 'skipped' WHERE id = ${card.id}`); continue; }
    try {
      const ref = card.channel === "email" ? await sendCardEmail(contact, card) : await sendSms(contact.mobile_au!, smsText(contact, card.body), `card:${card.id}`);
      await db.execute(sql`UPDATE outreach_cards SET status = 'sent', acted_at = ${Date.now()} WHERE id = ${card.id}`);
      await markTouched(contact, card, `Auto ${AUTO_LABEL[card.kind as AutoKind | "first"] ?? card.kind} ${card.channel === "email" ? "emailed" : "texted"} (${ref})`);
      sent.push(`• ${card.channel === "email" ? "✉️" : "📱"} ${contact.first_name}${contact.winery ? ` (${contact.winery})` : ""}`);
    } catch (err) {
      console.error(`[copilot] send card ${card.id} failed:`, err);
      await db.execute(sql`UPDATE outreach_cards SET status = 'failed' WHERE id = ${card.id}`);
      if (err instanceof Error && /ClickSend: (INSUFFICIENT_CREDIT|.*BALANCE)/i.test(err.message)) {
        await sendOperatorTelegram("⚠️ ClickSend is out of credit, so texts have paused. Top up at dashboard.clicksend.com.");
        break;
      }
    }
  }
  if (sent.length) await sendOperatorTelegram(`🤖 Sent ${sent.length} automatic message${sent.length === 1 ? "" : "s"}:\n${sent.join("\n")}\n\nThey stop by themselves if anyone replies, signs up or unsubscribes.`);
  return sent;
}

async function loadCard(id: number): Promise<{ card: Card; contact: Contact } | null> {
  const [card] = await rows<Card>(sql`SELECT id, contact_id, kind, channel, subject, body, status FROM outreach_cards WHERE id = ${id}`);
  if (!card) return null;
  const [contact] = await rows<Contact>(sql`SELECT ${COLS} FROM outreach_contacts c WHERE c.id = ${card.contact_id}`);
  return contact ? { card, contact } : null;
}

async function sendCardEmail(c: Contact, k: Card): Promise<string> {
  if (!c.email || !process.env.RESEND_API_KEY) throw new Error("No email address or Resend key");
  const isReply = k.kind === "reply";
  const url = pageUrl(c), unsub = unsubUrl(c);
  const wa = buildWaHref({ firstName: c.first_name, winery: c.winery });
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const footText = isReply ? "" : `\n\n—\nRich & Gel · Ownology · ownology.ai${wa ? `\nPrefer WhatsApp? ${wa}` : ""}\nDon't want to hear from us again? ${unsub}`;
  const footHtml = isReply ? "" : `<p style="font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:12px;margin-top:28px">Rich &amp; Gel · Ownology · ownology.ai${wa ? `<br>Prefer WhatsApp? <a href="${wa}" style="color:#6b7280">Message me there</a>` : ""}<br>Don't want to hear from us again? <a href="${unsub}" style="color:#6b7280">Unsubscribe</a></p>`;
  const text = `${k.body.replace("{URL}", url)}${footText}`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;color:#111827;line-height:1.6;font-size:15px">${k.body.split(/\n\n+/).map((p) => `<p>${esc(p).replace("{URL}", `<a href="${url}" style="color:#b45309;font-weight:600">${url}</a>`).replace(/\n/g, "<br>")}</p>`).join("")}${footHtml}</div>`;
  const inbound = replyAddress(c.slug);
  const r = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: FROM, to: [c.email], replyTo: inbound ? [inbound] : REPLY_TO, subject: k.subject || `${c.first_name}, a small idea`, text, html,
    ...(isReply ? {} : { headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } }),
  });
  if (r.error) throw new Error(r.error.message ?? "Resend failed");
  return r.data?.id ?? "";
}

async function markTouched(c: Contact, k: Card, note: string) {
  const col = sql.raw(k.channel === "email" ? "email_sent_at" : "sms_sent_at");
  const line = `\n[${sydney().date}] ${note}`;
  await db.execute(sql`UPDATE outreach_contacts SET ${col} = COALESCE(${col}, ${Date.now()}), notes = LEFT(CONCAT(COALESCE(notes,''), ${line}), 500) WHERE id = ${c.id}`);
}

export async function handleCardAction(action: string, id: number): Promise<string> {
  const loaded = await loadCard(id);
  if (!loaded) return "Card not found";
  const { card, contact } = loaded;
  if (card.status !== "pending" && card.status !== "later") return `Already ${card.status}`;
  const time = new Date().toLocaleTimeString("en-AU", { timeZone: "Australia/Sydney", hour: "numeric", minute: "2-digit" });
  let status: string, footer: string;
  if (action === "send") {
    if (card.channel === "sms") {
      if (!contact.mobile_au) return "No mobile on file";
      const ref = await sendSms(contact.mobile_au, card.kind === "reply" ? card.body : smsText(contact, card.body), `card:${card.id}`);
      await markTouched(contact, card, `Copilot ${card.kind} text sent (${ref})`);
      status = "sent"; footer = `✅ Texted ${contact.mobile_au} at ${time}`;
    } else {
      const resendId = await sendCardEmail(contact, card);
      await markTouched(contact, card, `Copilot ${card.kind} email sent (${resendId})`);
      status = "sent"; footer = `✅ Emailed ${contact.email} at ${time}`;
    }
  } else if (action === "sent") {
    await markTouched(contact, card, `Copilot ${card.kind} SMS sent`);
    status = "sent"; footer = `✅ SMS marked sent at ${time}`;
  } else if (action === "skip") { status = "skipped"; footer = "⏭ Skipped"; }
  else if (action === "later") { status = "later"; footer = "💤 Back in a week"; }
  else if (action === "unfit") {
    await db.execute(sql`UPDATE outreach_contacts SET status = 'skip' WHERE id = ${contact.id}`);
    status = "unfit"; footer = "🚫 Not a fit, won't show again";
  } else return "Unknown action";
  await db.execute(sql`UPDATE outreach_cards SET status = ${status}, acted_at = ${Date.now()} WHERE id = ${card.id}`);
  const [msg] = await rows<{ telegram_message_id: number | null }>(sql`SELECT telegram_message_id FROM outreach_cards WHERE id = ${card.id}`);
  const chatId = await operatorChatId();
  if (msg?.telegram_message_id && chatId) await tg("editMessageText", { chat_id: chatId, message_id: msg.telegram_message_id, text: cardText(contact, card, footer), disable_web_page_preview: true });
  return footer;
}

export async function scoreboard(days = 7): Promise<string> {
  const since = Date.now() - days * DAY;
  const [s] = await rows<Record<string, number>>(sql`SELECT
    SUM(status='sent') sent, SUM(status='skipped') skipped, SUM(status='unfit') unfit, SUM(status='pending') waiting,
    (SELECT COUNT(DISTINCT k2.contact_id) FROM outreach_cards k2 JOIN outreach_contacts c2 ON c2.id = k2.contact_id WHERE k2.status='sent' AND k2.acted_at > ${since} AND c2.first_viewed_at > k2.acted_at - ${DAY}) opened,
    (SELECT COUNT(*) FROM outreach_contacts WHERE replied_at > ${since}) replied,
    (SELECT COUNT(*) FROM outreach_contacts WHERE unsubscribed_at > ${since}) unsubscribed,
    (SELECT COUNT(*) FROM users WHERE created_at > ${since}) signups,
    (SELECT COUNT(*) FROM outreach_contacts c WHERE ${BASE_FILTER} AND ${TOUCHED} IS NULL) left_to_contact
    FROM outreach_cards WHERE created_at > ${since}`);
  const n = (k: string) => Number(s?.[k] ?? 0);
  return `📊 Outreach scoreboard — last ${days} days\n\nSent: ${n("sent")}\nOpened their page: ${n("opened")}\nReplied: ${n("replied")}\nNew sign-ups (all sources): ${n("signups")}\nSkipped: ${n("skipped")} · Not a fit: ${n("unfit")} · Unsubscribed: ${n("unsubscribed")}\nCards still waiting: ${n("waiting")}\n\nNever contacted yet: ${n("left_to_contact")}\n\nType /more for 3 extra cards, /score for this summary.`;
}

// Runs the morning batch once per Sydney day; DB row makes it safe across multiple instances.
const PREPARE_HOUR_SYD = 7;

async function claimToday(name: string, date: string): Promise<boolean> {
  await db.execute(sql`INSERT IGNORE INTO operator_settings (name, value, updated_at) VALUES (${name}, '', ${Date.now()})`);
  const [r] = await db.execute(sql`UPDATE operator_settings SET value = ${date}, updated_at = ${Date.now()} WHERE name = ${name} AND value <> ${date}`);
  return (r as unknown as { affectedRows: number }).affectedRows > 0;
}

// Every 10 min on Railway: once a day after 7:00 prepare + preview; every tick send anything past its preview window.
export async function runDailyIfDue(force = false): Promise<{ ran: boolean; queued?: number; sent?: number }> {
  const now = sydney();
  if (!(await operatorChatId())) return { ran: false };
  let queued = 0;
  if ((force || now.hour >= PREPARE_HOUR_SYD) && (await claimToday("copilot_prepared", now.date))) {
    queued = await prepareAutoBatch();
    if (!queued) await sendOperatorTelegram("☀️ Nothing automatic to send today.");
    if (now.weekday === "Fri") await sendOperatorTelegram(await scoreboard(7));
  }
  const sent = (await sendDueQueued()).length;
  return { ran: true, queued, sent };
}

async function webhook(req: Request, res: Response) {
  res.json({ ok: true });
  const secret = telegramWebhookSecret();
  if (!secret || req.get("X-Telegram-Bot-Api-Secret-Token") !== secret) return;
  const chatId = await operatorChatId();
  const update = req.body as {
    callback_query?: { id: string; data?: string; message?: { chat?: { id: number } } };
    message?: { text?: string; chat?: { id: number } };
  };
  try {
    const cq = update.callback_query;
    if (cq) {
      if (String(cq.message?.chat?.id) !== chatId) return;
      const [, action, id] = (cq.data ?? "").split(":");
      if (action === "hold" || action === "release") {
        await setHold(action === "hold");
        await tg("answerCallbackQuery", { callback_query_id: cq.id, text: action === "hold" ? "Held. Nothing sends today." : "Sending now…" });
        if (action === "release") await sendDueQueued(true);
        else await sendOperatorTelegram("⏸ Today's automatic messages are on hold. Type /release to send them, or /remove 123 to drop single ones first.");
        return;
      }
      let note: string;
      try { note = await handleCardAction(action, Number(id)); } catch (err) { note = `⚠️ ${err instanceof Error ? err.message : "Failed"}`; }
      await tg("answerCallbackQuery", { callback_query_id: cq.id, text: note.slice(0, 190) });
      return;
    }
    const m = update.message;
    if (!m || String(m.chat?.id) !== chatId) return;
    const cmd = (m.text ?? "").trim().toLowerCase();
    if (cmd.startsWith("/more")) {
      const sent = await createAndSendCards(3);
      if (!sent) await sendOperatorTelegram("No more prospects to show right now.");
    } else if (cmd.startsWith("/score")) await sendOperatorTelegram(await scoreboard(7));
    else if (cmd.startsWith("/remove")) {
      const ids = (cmd.match(/\d+/g) ?? []).map(Number);
      let n = 0;
      for (const i of ids) {
        const [r] = await db.execute(sql`UPDATE outreach_cards SET status = 'removed', acted_at = ${Date.now()} WHERE id = ${i} AND status = 'queued'`);
        n += (r as unknown as { affectedRows: number }).affectedRows;
      }
      await sendOperatorTelegram(`🗑 Removed ${n} message${n === 1 ? "" : "s"}${n < ids.length ? ` (${ids.length - n} already sent or not found)` : ""}.`);
    } else if (cmd.startsWith("/release")) {
      await setHold(false);
      const sent = await sendDueQueued(true);
      if (!sent.length) await sendOperatorTelegram("Nothing waiting to send.");
    }
    else if (cmd.startsWith("/help") || cmd.startsWith("/start")) await sendOperatorTelegram("Ownology copilot\n\n/more — 3 extra prospect cards\n/score — last 7 days\n/remove 123 — drop a queued message\n/release — send held messages now\n\nEvery morning at 7:00 you get a preview; it sends at 7:30.");
  } catch (err) {
    console.error("[copilot] webhook error:", err);
  }
}

async function smsRedirect(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (req.query.t !== sign(`sms:${id}`)) { res.status(403).send("Link expired"); return; }
  const loaded = await loadCard(id);
  if (!loaded?.contact.mobile_au) { res.status(404).send("No mobile on file"); return; }
  const to = loaded.contact.mobile_au.replace(/[^\d+]/g, "");
  res.redirect(302, `sms:${to}?&body=${encodeURIComponent(smsText(loaded.contact, loaded.card.body))}`);
}

async function unsubscribe(req: Request, res: Response) {
  const slug = String(req.query.c ?? "");
  if (!slug || req.query.t !== sign(`unsub:${slug}`)) { res.status(400).send("Invalid link"); return; }
  await db.execute(sql`UPDATE outreach_contacts SET unsubscribed_at = COALESCE(unsubscribed_at, ${Date.now()}) WHERE slug = ${slug}`);
  void sendOperatorTelegram(`🔕 ${slug} unsubscribed from outreach.`).catch(() => {});
  res.type("html").send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Georgia,serif;max-width:480px;margin:80px auto;padding:0 24px;color:#1f2937"><h1 style="font-size:22px">You're unsubscribed.</h1><p>You won't hear from Ownology again. Sorry for the bother, and all the best with the vintage.</p></body>`);
}

async function cronHandler(req: Request, res: Response) {
  const { dryRun, reason } = evaluateCronSecret(req, "outreach-cards", { hasApiKey: !!process.env.TELEGRAM_BOT_TOKEN });
  if (dryRun) {
    const picks = await pickContacts(DAILY_CARDS);
    const caps = await dailyCaps();
    const autos = [...(await pickAutoFollowups(caps.follow)), ...(await pickAutoFirstTexts(caps.texts)), ...(await pickAutoFirstEmails(caps.emails))];
    res.json({ ok: true, dryRun, reason, picks: picks.map((p) => ({ slug: p.contact.slug, kind: p.kind, channel: p.contact.email ? "email" : "sms" })), autos: autos.map((a) => ({ slug: a.contact.slug, kind: a.kind, channel: a.contact.email ? "email" : "sms", opened: a.opened })) });
    return;
  }
  res.json({ ok: true, dryRun, ...(await runDailyIfDue(req.query.force === "1")) });
}

export function registerOutreachCopilot(app: Express) {
  app.post("/api/telegram/webhook", express.json(), webhook);
  app.get("/api/outreach/sms/:id", smsRedirect);
  app.get("/api/outreach/unsubscribe", unsubscribe);
  app.post("/api/outreach/unsubscribe", express.urlencoded({ extended: false }), unsubscribe);
  app.get("/api/scheduled/outreach-cards", cronHandler);
  app.post("/api/scheduled/outreach-cards", express.json(), cronHandler);
}

// Production only: point the bot at the live webhook and check every 10 min whether the morning batch is due.
export function startOutreachCopilot() {
  if (!(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME) || !process.env.TELEGRAM_BOT_TOKEN) return;
  void tg("setWebhook", { url: `${PROD_URL}/api/telegram/webhook`, secret_token: telegramWebhookSecret(), allowed_updates: ["message", "callback_query"] });
  void tg("setMyCommands", { commands: [{ command: "more", description: "3 extra prospect cards" }, { command: "score", description: "Last 7 days scoreboard" }, { command: "remove", description: "Drop queued messages, e.g. /remove 123" }, { command: "release", description: "Send held messages now" }] });
  setInterval(() => { runDailyIfDue().catch((err) => console.error("[copilot] daily run failed:", err)); }, 10 * 60 * 1000);
}
