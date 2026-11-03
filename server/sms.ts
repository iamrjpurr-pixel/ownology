// ClickSend SMS: send to Australian mobiles; webhook token for inbound replies.
import { createHash } from "crypto";

const clean = (v?: string) => v?.trim().replace(/^["']|["']$/g, "") || "";

export const smsEnabled = () => !!(clean(process.env.CLICKSEND_USERNAME) && clean(process.env.CLICKSEND_API_KEY));

// "0412 345 678" | "61412345678" | "+61 412..." -> "+61412345678"; null if not an AU mobile.
export function auMobile(raw: string | null | undefined): string | null {
  const d = (raw ?? "").replace(/[^\d]/g, "");
  const local = d.startsWith("61") ? d.slice(2) : d.startsWith("0") ? d.slice(1) : d;
  return /^4\d{8}$/.test(local) ? `+61${local}` : null;
}

export function clicksendWebhookToken(): string | null {
  const key = clean(process.env.CLICKSEND_API_KEY);
  return key ? createHash("sha256").update(`ow-clicksend:${key}`).digest("hex").slice(0, 32) : null;
}

export async function sendSms(to: string, body: string, ref?: string): Promise<string> {
  const mobile = auMobile(to);
  if (!mobile) throw new Error("Not an Australian mobile number");
  if (!smsEnabled()) throw new Error("ClickSend isn't connected");
  const auth = Buffer.from(`${clean(process.env.CLICKSEND_USERNAME)}:${clean(process.env.CLICKSEND_API_KEY)}`).toString("base64");
  const from = clean(process.env.CLICKSEND_FROM);
  const res = await fetch("https://rest.clicksend.com/v3/sms/send", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ source: "ownology", to: mobile, body, ...(from ? { from } : {}), ...(ref ? { custom_string: ref.slice(0, 100) } : {}) }] }),
  });
  const data = (await res.json().catch(() => ({}))) as { response_code?: string; response_msg?: string; data?: { messages?: { status?: string; message_id?: string }[] } };
  const msg = data.data?.messages?.[0];
  if (!res.ok || data.response_code !== "SUCCESS" || (msg?.status && msg.status !== "SUCCESS")) {
    throw new Error(`ClickSend: ${msg?.status ?? data.response_msg ?? res.status}`);
  }
  return msg?.message_id ?? "";
}
