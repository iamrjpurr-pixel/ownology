// Plain-English operator assistant on Telegram: "How's Angullong going?", "Text Rod that Thursday works", "Who's hot?".
import { sql } from "drizzle-orm";
import { db } from "./db.js";
import { chatCompletion, MODELS } from "./_core/llm.js";
import { sendOperatorTelegram } from "./telegram.js";
import { jsonOf } from "./outreachNews.js";
import { scoreboard, setHold, sendDueQueued } from "./outreachCopilot.js";

const DAY = 24 * 60 * 60 * 1000;
const rows = async <T,>(q: ReturnType<typeof sql>) => (await db.execute(q))[0] as unknown as T[];
const when = (ms: number | null) => (ms ? new Date(Number(ms)).toLocaleString("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "never");

type Person = {
  id: number; slug: string; first_name: string; last_name: string | null; winery: string | null; region: string | null; email: string | null; mobile_au: string | null;
  status: string | null; view_count: number | null; first_viewed_at: number | null; email_sent_at: number | null; sms_sent_at: number | null; insta_contacted_at: number | null;
  replied_at: number | null; reply_text: string | null; unsubscribed_at: number | null; demo_booked_at: number | null; notes: string | null; hook_text: string | null;
};
type Plan = { action: "status" | "hot" | "send" | "note" | "notfit" | "hold" | "release" | "score" | "chat"; query?: string; channel?: "email" | "sms"; instruction?: string; exact?: boolean; text?: string };

const PERSON_COLS = sql.raw(`id, slug, first_name, last_name, winery, region, email, mobile_au, status, view_count, first_viewed_at, email_sent_at, sms_sent_at,
  insta_contacted_at, replied_at, reply_text, unsubscribed_at, demo_booked_at, notes, hook_text`);

async function lastContactId(): Promise<number | null> {
  const [r] = await rows<{ value: string }>(sql`SELECT value FROM operator_settings WHERE name = 'assistant_last_contact'`);
  return r ? Number(r.value) : null;
}
async function rememberContact(id: number) {
  await db.execute(sql`INSERT INTO operator_settings (name, value, updated_at) VALUES ('assistant_last_contact', ${String(id)}, ${Date.now()})
    ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)`);
}

async function findPeople(query: string | undefined): Promise<Person[]> {
  const words = (query ?? "").toLowerCase().replace(/[^a-z0-9&' -]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !["the", "and", "wines", "wine", "winery", "estate", "vineyard", "vineyards"].includes(w));
  if (!words.length) {
    const id = await lastContactId();
    return id ? rows<Person>(sql`SELECT ${PERSON_COLS} FROM outreach_contacts WHERE id = ${id}`) : [];
  }
  const hay = sql.raw("LOWER(CONCAT_WS(' ', first_name, last_name, winery, slug))");
  const score = sql.join(words.map((w) => sql`(${hay} LIKE ${`%${w}%`})`), sql` + `);
  return rows<Person>(sql`SELECT ${PERSON_COLS}, (${score}) score FROM outreach_contacts HAVING score > 0 ORDER BY score DESC, COALESCE(view_count,0) DESC LIMIT 5`).then((r) => {
    const top = Number((r[0] as unknown as { score: number } | undefined)?.score ?? 0);
    return r.filter((p) => Number((p as unknown as { score: number }).score) === top);
  });
}

function tail(text: string, max: number): string {
  if (text.length <= max) return text;
  let i = text.length - max;
  if (!/\s/.test(text[i - 1])) { const next = text.slice(i).search(/\s/); i = next === -1 ? i : i + next + 1; }
  return `…${text.slice(i)}`;
}

export async function describe(p: Person): Promise<string> {
  const cards = await rows<{ id: number; kind: string; channel: string; status: string; subject: string | null; body: string; acted_at: number | null; created_at: number }>(
    sql`SELECT id, kind, channel, status, subject, body, acted_at, created_at FROM outreach_cards WHERE contact_id = ${p.id} ORDER BY id DESC LIMIT 6`);
  const [ev] = await rows<{ n: number; sessions: number; last: number | null }>(sql`SELECT COUNT(*) n, COUNT(DISTINCT session_id) sessions, MAX(created_at) last FROM user_events WHERE slug = ${p.slug}`);
  return [
    `${p.first_name}${p.last_name ? ` ${p.last_name}` : ""}${p.winery ? `, ${p.winery}` : ""}${p.region ? ` (${p.region})` : ""}`,
    `Contact: ${p.email ?? "no email"} · ${p.mobile_au ?? "no mobile"}`,
    `CRM status: ${p.unsubscribed_at ? "UNSUBSCRIBED" : p.status ?? "cold"}${p.demo_booked_at ? " · demo booked" : ""}`,
    `First contact: email ${when(p.email_sent_at)}, text ${when(p.sms_sent_at)}, Instagram ${when(p.insta_contacted_at)}`,
    `Page views: ${p.view_count ?? 0} (first ${when(p.first_viewed_at)}); tracked visits: ${ev?.sessions ?? 0} sessions, last ${when(ev?.last ?? null)}`,
    p.replied_at ? `REPLIED ${when(p.replied_at)}: "${(p.reply_text ?? "").slice(0, 300)}"` : "No reply yet",
    cards.length ? `Messages (newest first):\n${cards.map((k) => `- #${k.id} ${when(k.acted_at ?? k.created_at)} ${k.kind} ${k.channel} [${k.status}] ${k.subject ?? ""} ${k.body.replace(/\s+/g, " ").slice(0, 140)}`).join("\n")}` : "No messages logged",
    p.notes && `Notes: ${tail(p.notes, 400)}`,
  ].filter(Boolean).join("\n");
}

async function hotList(): Promise<string> {
  const r = await rows<{ first_name: string; winery: string | null; v: number; replied_at: number | null; last: number | null }>(sql`SELECT c.first_name, c.winery, COALESCE(c.view_count,0) v, c.replied_at,
      (SELECT MAX(e.created_at) FROM user_events e WHERE e.slug = c.slug) last
    FROM outreach_contacts c WHERE c.unsubscribed_at IS NULL AND COALESCE(c.status,'cold') <> 'skip'
      AND (c.replied_at > ${Date.now() - 14 * DAY} OR COALESCE(c.view_count,0) >= 2 OR EXISTS (SELECT 1 FROM user_events e WHERE e.slug = c.slug AND e.created_at > ${Date.now() - 7 * DAY}))
    ORDER BY c.replied_at DESC, v DESC LIMIT 12`);
  if (!r.length) return "Nobody's showing real interest right now.";
  return r.map((p) => `• ${p.first_name}${p.winery ? ` (${p.winery})` : ""}: ${p.replied_at ? `replied ${when(p.replied_at)}` : `${p.v} views, last visit ${when(p.last)}`}`).join("\n");
}

async function plan(text: string): Promise<Plan> {
  const lastId = await lastContactId();
  const [last] = lastId ? await rows<{ first_name: string; winery: string | null }>(sql`SELECT first_name, winery FROM outreach_contacts WHERE id = ${lastId}`) : [];
  const raw = await chatCompletion([
    { role: "system", content: `You turn Rich's Telegram message into ONE action for his outreach CRM. Actions:
status (how is a prospect going) · hot (who is interested / who to chase) · send (message a prospect; set channel if he says text/SMS or email; instruction = what he wants said; exact=true only if he gave the exact wording in quotes) · note (add a CRM note; text = the note) · notfit (mark a prospect not a fit) · hold (pause today's automatic sends) · release (send held messages now) · score (stats) · chat (anything else; answer it).
query = the person or winery name he means, or "" if he means the last person discussed${last ? ` (${last.first_name}${last.winery ? ` of ${last.winery}` : ""})` : ""}.
Reply with ONLY JSON: {"action":...,"query":string,"channel":"email"|"sms"|null,"instruction":string,"exact":boolean,"text":string}` },
    { role: "user", content: text },
  ], { model: MODELS.PREMIUM, json: true, maxTokens: 400, temperature: 0, source: "telegram-assistant" });
  return jsonOf<Plan>(raw);
}

async function draft(p: Person, channel: "email" | "sms", instruction: string): Promise<{ subject: string; body: string }> {
  const raw = await chatCompletion([
    { role: "system", content: `Write the message Rich asked for, from Rich & Gel at Ownology to this prospect. Keep his meaning exactly; don't add offers or claims he didn't ask for. Warm, plain Australian English, no hype. ${channel === "sms" ? "SMS: under 300 characters, sign '— Rich, Ownology'. No subject." : "Email: start \"G'day <first name>,\", short, sign \"Cheers,\\nRich & Gel\". Subject under 60 chars (use \"Re: <their last subject>\" if continuing a thread)."}
Reply with ONLY JSON: {"subject":string,"body":string}` },
    { role: "user", content: `Rich's request: ${instruction}\n\nProspect file:\n${await describe(p)}` },
  ], { model: MODELS.PREMIUM, json: true, maxTokens: 700, temperature: 0.3, source: "telegram-assistant" });
  return jsonOf<{ subject: string; body: string }>(raw);
}

async function pickOne(query: string | undefined): Promise<Person | string> {
  const found = await findPeople(query);
  if (!found.length) return `I couldn't find anyone matching "${query ?? ""}". Try their first name and winery.`;
  if (found.length > 1) return `Which one?\n${found.map((p) => `• ${p.first_name}${p.last_name ? ` ${p.last_name}` : ""} (${p.winery ?? "no winery"})`).join("\n")}`;
  await rememberContact(found[0].id);
  return found[0];
}

export async function handleAssistantMessage(text: string): Promise<void> {
  const p = await plan(text);
  if (p.action === "hold") { await setHold(true); await sendOperatorTelegram("⏸ Held. No automatic messages will go out today. Say \"release\" to send them."); return; }
  if (p.action === "release") { await setHold(false); const sent = await sendDueQueued(true); if (!sent.length) await sendOperatorTelegram("Released. Nothing was waiting to send."); return; }
  if (p.action === "score") { await sendOperatorTelegram(await scoreboard(7)); return; }
  if (p.action === "hot") { await sendOperatorTelegram(`🔥 Showing interest:\n${await hotList()}`); return; }
  if (p.action === "chat") {
    const raw = await chatCompletion([
      { role: "system", content: "You're Rich's outreach assistant for Ownology. Answer briefly from the data given. If the data doesn't cover it, say so and suggest what he can ask (e.g. 'How's <winery> going?', 'Who's hot?', 'Text <name> that ...', 'Hold today's messages')." },
      { role: "user", content: `${text}\n\nData:\n${await scoreboard(7)}\n\nInterested prospects:\n${await hotList()}` },
    ], { model: MODELS.PREMIUM, maxTokens: 500, temperature: 0.3, source: "telegram-assistant" });
    await sendOperatorTelegram(raw.slice(0, 3900));
    return;
  }
  const person = await pickOne(p.query);
  if (typeof person === "string") { await sendOperatorTelegram(person); return; }
  if (p.action === "status") { await sendOperatorTelegram(`📇 ${await describe(person)}`.slice(0, 3900)); return; }
  if (p.action === "note") {
    await db.execute(sql`UPDATE outreach_contacts SET notes = CONCAT(COALESCE(notes,''), ${`\n[${new Date().toISOString().slice(0, 10)} Telegram] ${p.text ?? text}`}) WHERE id = ${person.id}`);
    await sendOperatorTelegram(`📝 Added a note to ${person.first_name} (${person.winery ?? ""}).`);
    return;
  }
  if (p.action === "notfit") {
    await db.execute(sql`UPDATE outreach_contacts SET status = 'skip' WHERE id = ${person.id}`);
    await sendOperatorTelegram(`🚫 ${person.first_name} (${person.winery ?? ""}) marked not a fit. No more automatic messages.`);
    return;
  }
  if (person.unsubscribed_at) { await sendOperatorTelegram(`🔕 ${person.first_name} has unsubscribed, so I won't message them.`); return; }
  const channel = p.channel === "sms" || (!person.email && person.mobile_au) ? "sms" : "email";
  if (channel === "sms" ? !person.mobile_au : !person.email) { await sendOperatorTelegram(`${person.first_name} has no ${channel === "sms" ? "mobile" : "email"} on file.`); return; }
  const m = p.exact && p.instruction ? { subject: `A note from Rich & Gel`, body: p.instruction } : await draft(person, channel, p.instruction || text);
  const [ins] = await db.execute(sql`INSERT INTO outreach_cards (contact_id, kind, channel, subject, body, status, created_at)
    VALUES (${person.id}, 'reply', ${channel}, ${channel === "email" ? m.subject.slice(0, 200) : null}, ${m.body}, 'pending', ${Date.now()})`);
  const id = (ins as unknown as { insertId: number }).insertId;
  const to = channel === "email" ? `✉️ ${person.email}${m.subject ? `\nSubject: ${m.subject}` : ""}` : `📱 ${person.mobile_au}`;
  const msgId = await sendOperatorTelegram(`Draft for ${person.first_name} (${person.winery ?? ""})\n${to}\n———\n${m.body}`.slice(0, 3900),
    [[{ text: channel === "email" ? "✉️ Send email" : "📱 Send text", callback_data: `oc:send:${id}` }, { text: "⏭ Don't send", callback_data: `oc:skip:${id}` }]]);
  if (msgId) await db.execute(sql`UPDATE outreach_cards SET telegram_message_id = ${msgId} WHERE id = ${id}`);
}

