// Inbound replies: Resend `email.received` webhook → mark the prospect replied (stops follow-ups) → Telegram card with an AI-drafted answer.
import type { Express, Request, Response } from "express";
import express from "express";
import { Resend } from "resend";
import { sql } from "drizzle-orm";
import { db } from "./db.js";
import { chatCompletion, MODELS } from "./_core/llm.js";
import { sendOperatorTelegram } from "./telegram.js";

type ReplyContact = { id: number; slug: string; first_name: string; winery: string | null; email: string | null };
const rows = async <T,>(q: ReturnType<typeof sql>) => ((await db.execute(q))[0] as unknown as T[]);

export function replyAddress(slug: string): string | null {
  const domain = process.env.INBOUND_REPLY_DOMAIN?.trim();
  return domain ? `reply+${slug}@${domain}` : null;
}

export function cleanReply(text: string): string {
  const cut = text.split(/\r?\n(?:On .{5,200}wrote:|-{2,}\s*Original Message|From: .+\r?\nSent: )/i)[0];
  return cut.split(/\r?\n/).filter((l) => !l.trim().startsWith(">")).join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 2000);
}

const emailOf = (from: string) => (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();

async function findContact(recipients: string[], from: string): Promise<ReplyContact | null> {
  const slug = recipients.map((r) => emailOf(r).match(/^reply\+([a-z0-9-]+)@/)?.[1]).find(Boolean);
  const bySlug = slug ? await rows<ReplyContact>(sql`SELECT id, slug, first_name, winery, email FROM outreach_contacts WHERE slug = ${slug} LIMIT 1`) : [];
  if (bySlug[0]) return bySlug[0];
  const [byEmail] = await rows<ReplyContact>(sql`SELECT id, slug, first_name, winery, email FROM outreach_contacts WHERE LOWER(email) = ${emailOf(from)} LIMIT 1`);
  return byEmail ?? null;
}

async function classifyAndDraft(c: ReplyContact, reply: string): Promise<{ sentiment: string; draft: string }> {
  try {
    const raw = await chatCompletion([
      { role: "system", content: `You help Rich, Australian founder of Ownology (Brand Vault + quality record + 'Ask Owen' AI for boutique winemakers), answer a prospect's email reply. 1) Classify the reply: "interested" | "objection" | "not-now" | "cold". 2) Draft Rich's answer: plain warm Australian English, 40-110 words, answer what they actually said, if interested propose a 15-minute call and offer to load their wines into a vault for them; if not-now, agree and say you'll leave it; if cold, thank them and confirm you won't email again. Start "G'day <first name>," and sign off "Cheers,\\nRich". Return JSON {"sentiment": string, "draft": string}.` },
      { role: "user", content: `Prospect: ${c.first_name}${c.winery ? ` at ${c.winery}` : ""}\n\nTheir reply:\n${reply}` },
    ], { model: MODELS.CHEAP, json: true, maxTokens: 500, temperature: 0.5, source: "reply-catcher" });
    const j = JSON.parse(raw) as { sentiment?: string; draft?: string };
    const sentiment = ["interested", "objection", "not-now", "cold"].includes(j.sentiment ?? "") ? j.sentiment! : "interested";
    if (j.draft) return { sentiment, draft: j.draft.slice(0, 2000) };
  } catch (err) {
    console.error("[inbound] draft failed:", err);
  }
  return { sentiment: "interested", draft: `G'day ${c.first_name},\n\nThanks for getting back to me. Happy to help however suits you best. Would a quick 15-minute call this week work?\n\nCheers,\nRich` };
}

const SENTIMENT_LABEL: Record<string, string> = { interested: "🟢 Interested", objection: "🟠 Has a concern", "not-now": "🟡 Not right now", cold: "⚪ Not interested" };

export async function handleInbound(emailId: string): Promise<void> {
  const [ins] = await db.execute(sql`INSERT IGNORE INTO inbound_emails (email_id, created_at) VALUES (${emailId}, ${Date.now()})`);
  if ((ins as unknown as { affectedRows: number }).affectedRows !== 1) return;
  const { data: email, error } = await new Resend(process.env.RESEND_API_KEY).emails.receiving.get(emailId);
  if (error || !email) {
    await db.execute(sql`DELETE FROM inbound_emails WHERE email_id = ${emailId}`);
    throw new Error(error?.message ?? "received email not found");
  }
  await processInbound(emailId, email);
}

type InboundEmail = { from: string; subject: string; text: string | null; html: string | null; to: string[] | null; received_for: string[] | null };

export async function processInbound(emailId: string, email: InboundEmail): Promise<void> {
  const reply = cleanReply(email.text ?? (email.html ?? "").replace(/<[^>]+>/g, " "));
  const contact = await findContact([...(email.to ?? []), ...(email.received_for ?? [])], email.from);
  if (!contact) {
    await sendOperatorTelegram(`📥 Email to your reply address from ${email.from}\nSubject: ${email.subject}\n\n${reply.slice(0, 1500)}`);
    return;
  }
  await db.execute(sql`UPDATE inbound_emails SET contact_id = ${contact.id} WHERE email_id = ${emailId}`);
  const wantsOut = reply.length < 200 && /\b(stop|unsubscribe|remove me|take me off)\b/i.test(reply);
  const { sentiment, draft } = await classifyAndDraft(contact, reply);
  await db.execute(sql`UPDATE outreach_contacts SET replied_at = ${Date.now()}, reply_text = ${reply.slice(0, 2000)}, reply_sentiment = ${sentiment}
    ${wantsOut ? sql`, unsubscribed_at = COALESCE(unsubscribed_at, ${Date.now()})` : sql``} WHERE id = ${contact.id}`);
  const subject = /^re:/i.test(email.subject) ? email.subject : `Re: ${email.subject}`;
  const [card] = await db.execute(sql`INSERT INTO outreach_cards (contact_id, kind, channel, subject, body, status, created_at)
    VALUES (${contact.id}, 'reply', 'email', ${subject.slice(0, 200)}, ${draft}, 'pending', ${Date.now()})`);
  const cardId = (card as unknown as { insertId: number }).insertId;
  const text = `📥 REPLY from ${contact.first_name}${contact.winery ? ` — ${contact.winery}` : ""}\n${SENTIMENT_LABEL[sentiment]}${wantsOut ? " · unsubscribed" : ""}\n\n“${reply.slice(0, 1200)}”\n\n———\nSuggested answer:\n\n${draft}\n\n(Their automatic follow-ups have stopped.)`;
  const messageId = await sendOperatorTelegram(text.slice(0, 4000), [[{ text: "✉️ Send this answer", callback_data: `oc:send:${cardId}` }, { text: "✋ I'll reply myself", callback_data: `oc:skip:${cardId}` }]]);
  if (messageId) await db.execute(sql`UPDATE outreach_cards SET telegram_message_id = ${messageId} WHERE id = ${cardId}`);
}

async function webhook(req: Request, res: Response) {
  const secret = process.env.RESEND_INBOUND_SECRET;
  if (!secret || !process.env.RESEND_API_KEY) { res.status(503).json({ error: "not configured" }); return; }
  let event: { type: string; data?: { email_id?: string } };
  try {
    event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
      payload: (req.body as Buffer).toString("utf8"),
      headers: { id: req.get("svix-id") ?? "", timestamp: req.get("svix-timestamp") ?? "", signature: req.get("svix-signature") ?? "" },
      webhookSecret: secret,
    }) as typeof event;
  } catch {
    res.status(400).json({ error: "invalid signature" });
    return;
  }
  if (event.type !== "email.received" || !event.data?.email_id) { res.status(204).end(); return; }
  try {
    await handleInbound(event.data.email_id);
    res.status(204).end();
  } catch (err) {
    console.error("[inbound] processing failed:", err);
    res.status(500).json({ error: "processing failed" });
  }
}

export function registerInboundReplies(app: Express) {
  app.post("/api/resend/inbound", express.raw({ type: "*/*", limit: "1mb" }), webhook);
}
