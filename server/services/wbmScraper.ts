/**
 * wbmScraper — parse the WBM Online news index into structured items.
 *
 * WBM's WordPress feed is Cloudflare/WP-Engine-gated to bot user agents
 * (`/feed/` returns 403 to headless clients), but the HTML news index
 * at https://wbmonline.com.au/news/ serves fine to any realistic
 * browser UA. We scrape the HTML with regex because:
 *   1. The markup is highly regular (Nectar theme WordPress pattern)
 *   2. Adding cheerio just for one page inflates the bundle
 *   3. The failure mode is graceful (missing item = skip, doesn't crash)
 *
 * Region normalisation maps WBM's category slugs onto the same slug
 * space used by outreach_contacts.region, so `matchContacts` can join
 * on a plain equality without a lookup table at query time.
 *
 * Feb 2026, Rich — first source in the industry-news vertical. Add
 * dailyWineNewsScraper.ts / grapegrowerScraper.ts alongside when
 * broadening.
 */

const WBM_NEWS_URL = "https://wbmonline.com.au/news/";

// Realistic desktop Chrome UA — Cloudflare + WP Engine turn away
// generic Node user agents at the edge.
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-AU,en;q=0.9",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

/** WBM category slug → outreach_contacts.region slug. Anything not
 *  in this map is treated as a non-region tag (news / winemaking /
 *  business / etc.) and dropped when picking the item's region.
 *
 *  Grow this map whenever WBM tags a new region. If a region tag
 *  arrives that isn't here, the item still lands in the DB with
 *  region=null — Rich just won't get an auto-match for it. Better
 *  than silently misrouting to the wrong region. */
const WBM_REGION_MAP: Record<string, string> = {
  "adelaide-hills": "adelaide-hills",
  "barossa": "barossa",
  "barossa-valley": "barossa",
  "beechworth": "beechworth",
  "canberra": "canberra",
  "canberra-district": "canberra",
  "clare": "clare",
  "clare-valley": "clare",
  "coonawarra": "coonawarra",
  "eden-valley": "eden-valley",
  "grampians": "grampians",
  "granite-belt": "granite-belt",
  "great-southern": "great-southern",
  "heathcote": "heathcote",
  "hunter": "hunter",
  "hunter-valley": "hunter",
  "king-valley": "king-valley",
  "langhorne-creek": "langhorne-creek",
  "mclaren-vale": "mclaren-vale",
  "margaret-river": "margaret-river",
  "mornington-peninsula": "mornington-peninsula",
  "mudgee": "mudgee",
  "murray-darling": "murray-darling",
  "orange": "orange",
  "riverina": "riverina",
  "riverland": "riverland",
  "rutherglen": "rutherglen",
  "swan-valley": "swan-valley",
  "tasmania": "tasmania",
  "tumbarumba": "tumbarumba",
  "yarra-valley": "yarra-valley",
};

export interface ScrapedNewsItem {
  source: "wbm";
  url: string;
  headline: string;
  dek: string | null;
  imageUrl: string | null;
  region: string | null;
  categories: string[]; // ["news", "tasmania", "vintage-2026"]
  author: string | null;
  publishedAtMs: number;
}

/** Decode a small set of HTML entities WordPress emits. Not exhaustive;
 *  we only need the ones that actually turn up in WBM headlines and
 *  excerpts (curly quotes, ampersand, ellipsis, en/em dash). */
function decodeEntities(s: string): string {
  return s
    .replaceAll("&#8216;", "\u2018")
    .replaceAll("&#8217;", "\u2019")
    .replaceAll("&#8220;", "\u201c")
    .replaceAll("&#8221;", "\u201d")
    .replaceAll("&#8211;", "\u2013")
    .replaceAll("&#8212;", "\u2014")
    .replaceAll("&#038;", "&")
    .replaceAll("&hellip;", "\u2026")
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

/** Parse WBM's date format ("Wednesday 15 July 2026") to epoch ms.
 *  Uses noon UTC to avoid TZ boundary flips. Returns null when the
 *  string doesn't match — caller then falls back to fetchedAt. */
function parseWbmDate(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  // Strip weekday prefix if present.
  const m = cleaned.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthName = m[2].toLowerCase();
  const year = parseInt(m[3], 10);
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };
  const month = months[monthName];
  if (month === undefined || isNaN(day) || isNaN(year)) return null;
  return Date.UTC(year, month, day, 12, 0, 0);
}

/** Given the class list of an <article> element, pull the category
 *  slugs (dropping the "category-" prefix). Return regionSlug (the
 *  first tag that maps into our region space) + full categories array. */
function extractCategoriesAndRegion(classAttr: string): { categories: string[]; region: string | null } {
  const cats: string[] = [];
  for (const c of classAttr.split(/\s+/)) {
    if (c.startsWith("category-")) {
      const slug = c.slice("category-".length);
      if (slug) cats.push(slug);
    }
  }
  let region: string | null = null;
  for (const c of cats) {
    if (WBM_REGION_MAP[c]) {
      region = WBM_REGION_MAP[c];
      break;
    }
  }
  return { categories: cats, region };
}

/** Parse a single <article>…</article> block. Returns null when a
 *  required field (url + headline) is missing — caller drops it. */
function parseArticleBlock(block: string): ScrapedNewsItem | null {
  const classMatch = block.match(/<article[^>]*class="([^"]*)"/);
  if (!classMatch) return null;
  const { categories, region } = extractCategoriesAndRegion(classMatch[1]);

  // Canonical article link — the "entire-meta-link" is the cleanest.
  const urlMatch =
    block.match(/<a class="entire-meta-link" href="([^"]+)"/) ??
    block.match(/<h3 class="title"><a href="([^"]+)"/);
  if (!urlMatch) return null;
  const url = urlMatch[1].trim();

  // Headline lives inside <h3 class="title"><a>…</a></h3>.
  const headlineMatch = block.match(/<h3 class="title"><a[^>]*>\s*([^<]+?)\s*<\/a><\/h3>/);
  if (!headlineMatch) return null;
  const headline = decodeEntities(headlineMatch[1]).trim();

  const dekMatch = block.match(/<div class="excerpt">([^<]+?)<\/div>/);
  const dek = dekMatch ? decodeEntities(dekMatch[1]).trim() : null;

  const imgMatch =
    block.match(/data-nectar-img-src="([^"]+)"/) ??
    block.match(/<img[^>]+src="([^"]+)"[^>]+class="[^"]*wp-post-image/);
  const imageUrl = imgMatch ? imgMatch[1].trim() : null;

  const authorMatch = block.match(/rel="author"[^>]*>([^<]+)<\/a>/);
  const author = authorMatch ? decodeEntities(authorMatch[1]).trim() : null;

  const dateMatch = block.match(/<div class="text">[\s\S]*?<span>([^<]+)<\/span>/);
  const publishedAtMs = parseWbmDate(dateMatch ? dateMatch[1] : null);

  return {
    source: "wbm",
    url,
    headline,
    dek,
    imageUrl,
    region,
    categories,
    author,
    publishedAtMs: publishedAtMs ?? Date.now(),
  };
}

/**
 * scrapeWbmNews — fetch the WBM news index and return structured items.
 *
 * Throws on network failure or an obviously blocked response (Cloudflare
 * challenge page — small body, no <article> tags). Caller wraps this
 * in the tRPC mutation so the admin UI surfaces the message.
 */
export async function scrapeWbmNews(): Promise<ScrapedNewsItem[]> {
  const resp = await fetch(WBM_NEWS_URL, { headers: BROWSER_HEADERS });
  if (!resp.ok) {
    throw new Error(`WBM fetch failed: HTTP ${resp.status}`);
  }
  const html = await resp.text();
  if (html.length < 20_000) {
    // Cloudflare challenge / block pages are all under 10 KB. The
    // real page is ~270 KB. This threshold catches the block cleanly.
    throw new Error(`WBM fetch too small (${html.length} bytes) — likely a Cloudflare block`);
  }
  const items: ScrapedNewsItem[] = [];
  const blockRegex = /<article id="post-\d+"[\s\S]*?<\/article>/g;
  const matches = html.match(blockRegex);
  if (!matches || matches.length === 0) {
    throw new Error("WBM parse yielded zero articles — layout may have changed");
  }
  for (const block of matches) {
    const parsed = parseArticleBlock(block);
    if (parsed) items.push(parsed);
  }
  return items;
}

/** Exposed for the /admin/industry-news UI so operators can see which
 *  region slugs the scraper knows about (helps them decide if adding
 *  a new alias is worthwhile). */
export function wbmRegionMap(): Record<string, string> {
  return { ...WBM_REGION_MAP };
}
