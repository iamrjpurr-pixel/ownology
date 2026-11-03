// "Saw this and thought of you": web-scouted news per prospect, judged by AI before anything is drafted.
import { sql } from "drizzle-orm";
import { db } from "./db.js";
import { chatCompletion, MODELS } from "./_core/llm.js";

const DAY = 24 * 60 * 60 * 1000;
const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
export function jsonOf<T>(raw: string): T {
  const end = raw.lastIndexOf("}");
  for (let i = raw.indexOf("{"); i !== -1 && i < end; i = raw.indexOf("{", i + 1)) {
    try { return JSON.parse(raw.slice(i, end + 1)) as T; } catch { /* try next brace */ }
  }
  throw new Error(`No JSON: ${raw.slice(0, 80)}`);
}

async function urlOk(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "GET", redirect: "follow", headers: { "User-Agent": "Mozilla/5.0 (compatible; OwnologyLinkCheck)" }, signal: AbortSignal.timeout(10_000) });
    return r.status < 400 || r.status === 403;
  } catch { return false; }
}
async function liveOnly<I extends { url: string }>(items: I[]): Promise<I[]> {
  const ok = await Promise.all(items.map((i) => urlOk(i.url)));
  return items.filter((_, n) => ok[n]);
}

type NewsItem = { scope: string; headline: string; summary: string; url: string; date?: string | null };

async function perplexity(system: string, user: string, attempt = 0): Promise<string> {
  const resp = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "sonar-pro", max_tokens: 1200, search_recency_filter: "month", messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    signal: AbortSignal.timeout(90_000),
  });
  if (resp.status === 429 && attempt < 4) { await sleep(15_000 * (attempt + 1)); return perplexity(system, user, attempt + 1); }
  if (!resp.ok) throw new Error(`Perplexity ${resp.status}`);
  const j = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content ?? "";
}

// Weekly: one shared scan of Australian wine news (regions, weather, rules), stored for matching against prospects.
export async function refreshIndustryNews(now = Date.now()): Promise<number> {
  const [r] = (await db.execute(sql`SELECT MAX(created_at) at FROM outreach_news`))[0] as unknown as { at: number | null }[];
  if (r?.at && now - Number(r.at) < 6 * DAY) return 0;
  const raw = await perplexity(
    `You scan Australian wine industry news for a small-winery software company. Return ONLY JSON: {"items":[{"scope":"national" or a state code (SA, VIC, NSW, WA, TAS, QLD) or a wine region name,"headline":string,"summary":"1-2 plain sentences on what it means for a small winemaker","url":"source URL","date":"YYYY-MM-DD"}]}. Up to 12 items, published in the last 21 days, each with a real source URL.`,
    "Find recent news that matters to small Australian winemakers: regional weather and seasonal events (frost, hail, smoke, flood, heat, rain at vintage), vine disease or pest outbreaks, new or changing rules (labelling, Label Integrity Program, packaging/APCO, container deposit schemes, energy statements, the winegrape purchase code), grants or support programs, and notable regional events or awards.",
  );
  const items = await liveOnly(jsonOf<{ items?: NewsItem[] }>(raw).items?.filter((i) => i.headline && /^https?:\/\//.test(i.url ?? "")) ?? []);
  for (const i of items) {
    await db.execute(sql`INSERT INTO outreach_news (scope, headline, summary, url, news_date, created_at)
      VALUES (${i.scope.slice(0, 80)}, ${i.headline.slice(0, 300)}, ${(i.summary ?? "").slice(0, 1000)}, ${i.url.slice(0, 500)}, ${i.date?.slice(0, 10) ?? null}, ${now})`);
  }
  return items.length;
}

export async function industryNewsText(now = Date.now()): Promise<string> {
  const items = (await db.execute(sql`SELECT scope, headline, summary, url, news_date FROM outreach_news WHERE created_at > ${now - 14 * DAY} ORDER BY id DESC LIMIT 15`))[0] as unknown as (NewsItem & { news_date: string | null })[];
  return items.map((i) => `- [${i.scope}] ${i.headline} (${i.news_date ?? "recent"}): ${i.summary} ${i.url}`).join("\n");
}

export async function winerySpecificNews(winery: string, region: string | null): Promise<string> {
  const raw = await perplexity(
    `You find recent PUBLIC news about one Australian winery. Return ONLY JSON: {"items":[{"headline":string,"summary":string,"url":string,"date":"YYYY-MM-DD"}]}. Only items from the last 45 days with a real source URL: awards and medals, new releases, press features, events, expansions, new winemaker, sales or closures. Empty list if nothing; never invent.`,
    `Winery: ${winery}${region ? `\nRegion: ${region}` : ""}`,
  );
  const items = await liveOnly(jsonOf<{ items?: Omit<NewsItem, "scope">[] }>(raw).items?.filter((i) => /^https?:\/\//.test(i.url ?? "")) ?? []);
  return items.map((i) => `- ${i.headline} (${i.date ?? "recent"}): ${i.summary} ${i.url}`).join("\n");
}

export type NewsDecision = { decision: "send" | "skip"; reason: string; channel?: "email" | "sms"; subject?: string; body?: string };

export async function decideNews(context: string): Promise<NewsDecision> {
  const raw = await chatCompletion([
    { role: "system", content: `You decide whether Rich & Gel (founders of Ownology: Brand Vault + quality records + 'Ask Owen' AI for boutique Australian winemakers) should send a short "saw this and thought of you" note to a quiet prospect. Judge like a thoughtful founder: send ONLY if a news item is genuinely about this winery, or clearly affects their region/state or type of business, AND it's recent enough to feel timely. Generic industry news that isn't clearly theirs = skip. Read each item carefully: only congratulate real achievements (a medal, a strong review, a launch); a mere listing or an 'almost made it' mention is not one. Don't quote their own words or personal hook back at them. One news item is better than two. Never send bad news about them in a way that feels like gloating (e.g. a closure); for a regional disaster be kind and practical, not salesy.
If sending: open with the news in one line (congratulate for awards/releases; for weather or rules, say what it might mean for them), connect it lightly to keeping good records / Ownology in one sentence, and offer one easy next step. Include the news source URL as plain text, and the literal token {URL} once for their personal page. They have NOT met us. Plain warm Australian English, zero hype. Email: 50-110 words, start "G'day <first name>,", sign "Cheers,\\nRich & Gel", subject max 60 chars about the news. SMS (only if no email): max 200 characters in total including {URL} and the source link, from Rich at Ownology; if it can't fit, skip.
Do your thinking silently. Your entire reply must be ONLY this JSON, starting with {: {"decision":"send"|"skip","reason":"one sentence for Rich","channel":"email"|"sms","subject":string,"body":string}` },
    { role: "user", content: context },
  ], { model: MODELS.PREMIUM, json: true, maxTokens: 1500, temperature: 0.3, source: "outreach-news" });
  return jsonOf<NewsDecision>(raw);
}
