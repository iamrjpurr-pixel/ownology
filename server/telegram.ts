// Telegram bot helpers for operator alerts + the outreach copilot.
import { createHash } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "./db.js";

export type TgButton = { text: string; callback_data?: string; url?: string };

export async function tg<T = unknown>(method: string, payload: Record<string, unknown>): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string };
  if (!data.ok) {
    console.error(`[telegram] ${method} failed:`, data.description ?? res.status);
    return null;
  }
  return data.result ?? null;
}

export async function operatorChatId(): Promise<string | null> {
  if (process.env.TELEGRAM_CHAT_ID) return process.env.TELEGRAM_CHAT_ID;
  const [rows] = await db.execute(sql`SELECT value FROM operator_settings WHERE name = 'telegram_chat_id' LIMIT 1`);
  return (rows as unknown as { value: string }[])[0]?.value ?? null;
}

export async function sendOperatorTelegram(text: string, buttons?: TgButton[][]): Promise<number | null> {
  const chatId = await operatorChatId();
  if (!chatId) return null;
  const msg = await tg<{ message_id: number }>("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
  return msg?.message_id ?? null;
}

export function telegramWebhookSecret(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  return token ? createHash("sha256").update(`ow-webhook:${token}`).digest("hex").slice(0, 48) : null;
}
