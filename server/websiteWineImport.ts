/**
 * websiteWineImport — read a winery's own website and turn its wine list into
 * draft Brand Vault specs. Uses the shop platform's public product feed when it
 * can (Commerce7, Shopify, WooCommerce), else the pages themselves; an LLM then
 * normalises each wine. Tasting notes are paraphrased, never copied.
 */
import { safeFetch } from "./ssrfGuard.js";
import { chatCompletion, MODELS } from "./_core/llm.js";

type RawItem = { title: string; subtitle?: string; text: string; facts?: Record<string, unknown>; url?: string };
export type WebsiteRead = { host: string; platform: string; items: number; wines: unknown[] };

const UA = { "User-Agent": "Mozilla/5.0 (compatible; OwnologyImporter/1.0; +https://ownology.ai)" };
const MAX_ITEMS = 40;

const htmlToText = (html: string) =>
  html
    .replace(/<(script|style|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|li|h\d|div)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&ndash;|&mdash;/g, "-")
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

async function getText(url: string, limit = 2_000_000): Promise<string> {
  const r = await safeFetch(url, { headers: UA, signal: AbortSignal.timeout(12_000) });
  if (!r.ok) throw new Error(`${url} returned ${r.status}`);
  return (await r.text()).slice(0, limit);
}

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T | null> {
  try {
    const r = await safeFetch(url, { headers: { ...UA, ...headers, Accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
    return r.ok ? ((await r.json()) as T) : null;
  } catch { return null; }
}

async function fromCommerce7(origin: string, tenant: string, slugHint: string | null): Promise<RawItem[]> {
  type P = { title: string; subTitle?: string; teaser?: string; content?: string; slug: string; type: string; wine?: Record<string, unknown> };
  const base = "https://api.commerce7.com/v2/product/for-web?limit=100";
  const h = { tenantid: tenant };
  const tries = [slugHint && `${base}&collectionSlug=${encodeURIComponent(slugHint)}`, `${base}&collectionSlug=wines`, base].filter(Boolean) as string[];
  for (const url of tries) {
    const d = await getJson<{ products?: P[] }>(url, h);
    const wines = (d?.products ?? []).filter((p) => p.type === "Wine");
    if (wines.length) return wines.map((p) => ({ title: p.title, subtitle: p.subTitle, text: htmlToText(`${p.teaser ?? ""}\n${p.content ?? ""}`), facts: p.wine, url: `${origin}/product/${p.slug}` }));
  }
  return [];
}

async function fromShopify(origin: string): Promise<RawItem[]> {
  const d = await getJson<{ products?: { title: string; handle: string; body_html?: string; product_type?: string; tags?: string[] | string }[] }>(`${origin}/products.json?limit=100`);
  return (d?.products ?? []).map((p) => ({ title: p.title, text: htmlToText(p.body_html ?? ""), facts: { type: p.product_type, tags: p.tags }, url: `${origin}/products/${p.handle}` }));
}

async function fromWoo(origin: string): Promise<RawItem[]> {
  const d = await getJson<{ name: string; permalink: string; description?: string; short_description?: string; categories?: { name: string }[] }[]>(`${origin}/wp-json/wc/store/v1/products?per_page=60`);
  return (Array.isArray(d) ? d : []).map((p) => ({ title: p.name, text: htmlToText(`${p.short_description ?? ""}\n${p.description ?? ""}`), facts: { categories: p.categories?.map((c) => c.name) }, url: p.permalink }));
}

async function fromPages(pageUrl: string, html: string): Promise<RawItem[]> {
  const origin = new URL(pageUrl).origin;
  const links = [...html.matchAll(/href=["']([^"'#]+)["']/gi)]
    .map((m) => { try { return new URL(m[1], pageUrl).toString(); } catch { return ""; } })
    .filter((u) => u.startsWith(origin) && /\/(product|products|wine|wines|shop|store)\/[^/?]+/i.test(u) && u !== pageUrl);
  const unique = [...new Set(links)].slice(0, 15);
  const pages = await Promise.all(unique.map(async (u) => { try { return { url: u, text: htmlToText(await getText(u, 600_000)).slice(0, 3000) }; } catch { return null; } }));
  const items: RawItem[] = pages.filter(Boolean).map((p) => ({ title: "", text: p!.text, url: p!.url }));
  items.unshift({ title: "(listing page)", text: htmlToText(html).slice(0, 8000), url: pageUrl });
  return items;
}

const SYSTEM = `You turn a winery's own product listings into Brand Vault wine specs. Return JSON {"wines":[...]}.
Only real wines the winery sells. Skip merchandise, gift cards, vouchers, mixed packs/bundles, tastings and events.
Each wine: {"name": string (no vintage year), "vintage": number|null (take the year in the product title first; otherwise the facts; NV or none -> null), "style": short e.g. "Dry white", "Off-dry white", "Rosé", "Dry red", "Sparkling", "Dessert", "Fortified",
"blend": [{"variety": string, "pct": number, "source": string}] (pct only if stated; a single-variety wine is 100; if several varieties with no stated split use 0; source = vineyard or region as stated, e.g. "Summerhill Lane vineyard, Orange NSW"),
"targets": {"alcohol"?: "13.3%", "ph"?: string, "ta"?: string, "rs"?: string} (only values actually stated),
"regime": {"yeast"?, "fermentTemp"?, "mlf"?, "oak"?, "additions"?, "finishing"?, "bottling"?} (short phrases, only what the text states, e.g. oak "Barrel fermented, 12 months on lees in new and seasoned oak"),
"tastingNotes": 1-2 sentences in YOUR OWN WORDS summarising aroma and palate (never copy sentences, never quote critics or scores),
"sourceUrl": string}.
Never invent facts. Leave a field out rather than guess.`;

export async function readWinesFromWebsite(rawUrl: string): Promise<WebsiteRead> {
  const url = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  const html = await getText(url);
  const { origin, host, pathname } = new URL(url);
  const tenant = html.match(/tenant["']?\s*[:=]\s*["']([a-z0-9-]+)["']/i)?.[1];
  const collectionSlug = pathname.match(/\/collection\/([^/]+)/)?.[1] ?? null;

  let platform = "website";
  let items: RawItem[] = [];
  if (tenant && /commerce7/i.test(html)) { platform = "Commerce7"; items = await fromCommerce7(origin, tenant, collectionSlug); }
  if (!items.length && /cdn\.shopify\.com|Shopify\.theme/i.test(html)) { platform = "Shopify"; items = await fromShopify(origin); }
  if (!items.length && /woocommerce/i.test(html)) { platform = "WooCommerce"; items = await fromWoo(origin); }
  if (!items.length) { platform = "website"; items = await fromPages(url, html); }
  if (!items.length) return { host, platform, items: 0, wines: [] };

  // Shop "facts" often carry a stale vintage; the year in the product title wins.
  const payload = items.slice(0, MAX_ITEMS).map((it) => {
    const facts = { ...(it.facts ?? {}) };
    if (/\b(19|20)\d{2}\b|\bNV\b|non[- ]vintage/i.test(it.title)) delete facts.vintage;
    return { ...it, facts, text: it.text.slice(0, 1800) };
  });
  const out = await chatCompletion(
    [{ role: "system", content: SYSTEM }, { role: "user", content: `Website: ${origin}\nListings:\n${JSON.stringify(payload)}` }],
    { model: MODELS.CHEAP, json: true, maxTokens: 12_000, source: "brandPortal.websiteImport" },
  );
  let wines: unknown[] = [];
  try { wines = (JSON.parse(out) as { wines?: unknown[] }).wines ?? []; } catch { wines = []; }
  return { host, platform, items: items.length, wines };
}
