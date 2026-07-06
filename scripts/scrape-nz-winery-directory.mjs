/**
 * Scrape NZ Wine winery directory → wine_producers table.
 *
 * Source: https://www.nzwine.com/en/winery-directory/ (public, static HTML,
 * paginated via ?page=1..11). Roughly 534 wineries as of Feb 2026.
 *
 * For each winery card on the listing page we visit the detail page and
 * extract region + website + email if present. Rate-limited by --delay
 * (default 500ms) so we're a good citizen.
 *
 * Idempotent: dedupes on (name, country="NZ"). Existing rows are UPDATE-d
 * only where a field is currently NULL — so any manual admin edits win.
 *
 * Usage:
 *   node scripts/scrape-nz-winery-directory.mjs                          # live, all 534
 *   node scripts/scrape-nz-winery-directory.mjs --dry-run                # no DB writes
 *   node scripts/scrape-nz-winery-directory.mjs --limit=20               # test with 20
 *   node scripts/scrape-nz-winery-directory.mjs --delay=1000             # 1s between reqs
 *   node scripts/scrape-nz-winery-directory.mjs --keyword=winery --tourism=sip,dine
 *     → uses the site's own filter (Sip AND Dine tourism, name contains "winery")
 *
 * Output on --dry-run: /tmp/nz-producers-preview.json
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { writeFileSync } from "fs";

const BASE = "https://www.nzwine.com";
const DIR = "/en/winery-directory/";
const UA = "Mozilla/5.0 (compatible; OwnologyBot/1.0; +https://ownology.ai/bot)";

// ── CLI flags ─────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const limitArg = argv.find((a) => a.startsWith("--limit="));
const delayArg = argv.find((a) => a.startsWith("--delay="));
const keywordArg = argv.find((a) => a.startsWith("--keyword="));
const tourismArg = argv.find((a) => a.startsWith("--tourism="));
const regionArg = argv.find((a) => a.startsWith("--region="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : null;
const delayMs = delayArg ? Number(delayArg.split("=")[1]) : 500;
const keyword = keywordArg ? keywordArg.split("=")[1] : null;
const tourism = tourismArg ? tourismArg.split("=")[1].split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : [];
const regionFilter = regionArg ? regionArg.split("=")[1].split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : [];

function buildListingUrl(page) {
  const parts = [`page=${page}`];
  if (keyword) parts.push(`q=${encodeURIComponent(keyword)}`);
  for (const t of tourism) parts.push(`filter-tourism-experience=${encodeURIComponent(t)}`);
  for (const r of regionFilter) parts.push(`filter-region=${encodeURIComponent(r)}`);
  return `${BASE}${DIR}?${parts.join("&")}`;
}

const log = (...m) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── HTML decoders ─────────────────────────────────────────────────────────
function decodeHtml(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/g, "/")
    .replace(/&#x2013;/g, "–")
    .replace(/&#x2019;/g, "'")
    .replace(/&#x2018;/g, "'")
    .replace(/&#x101;/g, "ā") // Māori macron a — common on NZ names
    .replace(/&#x113;/g, "ē")
    .replace(/&#x12B;/g, "ī")
    .replace(/&#x14D;/g, "ō")
    .replace(/&#x16B;/g, "ū")
    .replace(/&#x100;/g, "Ā")
    .replace(/&#x112;/g, "Ē")
    .replace(/&#x12A;/g, "Ī")
    .replace(/&#x14C;/g, "Ō")
    .replace(/&#x16A;/g, "Ū")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// ── Fetch with retry ──────────────────────────────────────────────────────
async function fetchText(url, attempt = 1) {
  try {
    const r = await fetch(url, {
      headers: { "user-agent": UA, "accept-language": "en-NZ,en" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } catch (err) {
    if (attempt < 3) {
      log(`  retry ${attempt} for ${url}: ${err.message}`);
      await sleep(2000 * attempt);
      return fetchText(url, attempt + 1);
    }
    throw err;
  }
}

// ── Listing parser ────────────────────────────────────────────────────────
function extractListingCards(html) {
  // Each card:
  //   <div class="c-winery-directory__item">
  //     ...
  //     <a href="/en/winery/<slug>" class="item-title theme-link">Name</a>
  const re = /class="c-winery-directory__item[^"]*"[\s\S]{0,1500}?<a href="(\/en\/winery\/([a-z0-9-]+))" class="item-title[^"]*">([^<]+)<\/a>/g;
  const cards = [];
  let m;
  while ((m = re.exec(html))) {
    cards.push({
      slug: m[2],
      name: decodeHtml(m[3].trim()),
      detailUrl: BASE + m[1],
    });
  }
  return cards;
}

// ── Detail parser ─────────────────────────────────────────────────────────
// Only fetch what we need: region (from the header lede above the brand
// image), website URL (first external non-social http/https link), and
// email (first mailto: link).
const SOCIAL_HOSTS = /(facebook\.com|instagram\.com|twitter\.com|x\.com|youtube\.com|linkedin\.com|tiktok\.com|nzwine\.com|typekit\.net|bri\.co\.nz|terabyte\.co\.nz|schema\.org|w3\.org|winetitles|use\.typekit\.net|resend\.com|googletagmanager\.com|google-analytics\.com|nzwinesearch\.co\.nz)/i;

// Region slugs used by nzwine.com — map to display names.
const REGION_SLUG_TO_NAME = {
  marlborough: "Marlborough",
  hawkesbay: "Hawke's Bay",
  centralotago: "Central Otago",
  northcanterbury: "North Canterbury",
  gisborne: "Gisborne",
  wairarapa: "Wairarapa",
  nelson: "Nelson",
  auckland: "Auckland",
  northland: "Northland",
  waitakivalley: "Waitaki Valley",
  canterbury: "Canterbury",
  waipara: "Waipara Valley",
  waikato: "Waikato",
  waiheke: "Waiheke Island",
};

function extractDetail(html) {
  // Primary: region shown in the header lede above the brand image.
  const regionM = html.match(/class="c-layout-header__lede[^"]*"[^>]*>\s*([^<]{2,60}?)\s*<\/div>/);
  let region = regionM ? decodeHtml(regionM[1].trim()) : null;

  // Fallback: the megamenu links each /en/regions/<slug>/ exactly once. Any
  // slug appearing 2+ times in the HTML is a winery-specific region link.
  // Take the first such slug in document order (primary region for
  // multi-region wineries).
  if (!region || region.length === 0) {
    const slugHits = [...html.matchAll(/href="\/en\/regions\/([a-z-]+)\/?"/g)].map((m) => m[1]);
    const counts = new Map();
    for (const s of slugHits) counts.set(s, (counts.get(s) ?? 0) + 1);
    const winerySlug = slugHits.find((s) => (counts.get(s) ?? 0) >= 2 && REGION_SLUG_TO_NAME[s]);
    if (winerySlug) region = REGION_SLUG_TO_NAME[winerySlug];
  }

  // Email — first mailto (excluding empty or generic bot addresses)
  const mailtos = [...html.matchAll(/mailto:([^"?&\s]+)/g)].map((m) => m[1]);
  const email = mailtos.find((e) => e.includes("@")) || null;

  // Website — first external, non-social URL
  const hrefs = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  const website =
    hrefs.find((u) => !SOCIAL_HOSTS.test(u) && !u.startsWith("https://use.typekit.net")) || null;

  return { region, email, website };
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  log(
    `starting scrape · dryRun=${dryRun} · limit=${limit ?? "none"} · delay=${delayMs}ms · keyword=${keyword ?? "-"} · tourism=[${tourism.join(",")}] · region=[${regionFilter.join(",")}]`
  );

  // Step 1: crawl listing pages until an empty one is returned
  const cards = [];
  const MAX_PAGES = 25;
  for (let p = 1; p <= MAX_PAGES; p++) {
    const url = buildListingUrl(p);
    log(`fetching listing page ${p}: ${url}`);
    const html = await fetchText(url);
    const pageCards = extractListingCards(html);
    if (pageCards.length === 0) {
      log(`  page ${p} returned 0 cards — end of results`);
      break;
    }
    // Dedupe against already-collected slugs (last page may partly overlap)
    const seen = new Set(cards.map((c) => c.slug));
    const fresh = pageCards.filter((c) => !seen.has(c.slug));
    cards.push(...fresh);
    log(`  → ${pageCards.length} on page (${fresh.length} new) · total ${cards.length}`);
    if (limit && cards.length >= limit) break;
    await sleep(delayMs);
  }
  const targets = limit ? cards.slice(0, limit) : cards;
  log(`listing complete: ${targets.length} wineries to enrich`);

  // Step 2: fetch each detail page
  const producers = [];
  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    try {
      const html = await fetchText(c.detailUrl);
      const d = extractDetail(html);
      producers.push({
        name: c.name,
        country: "NZ",
        region: d.region,
        website: d.website,
        email: d.email,
        phase1Source: "nzwine.com",
        slug: c.slug,
      });
    } catch (err) {
      log(`  SKIP ${c.slug}: ${err.message}`);
    }
    if ((i + 1) % 25 === 0 || i === targets.length - 1) {
      const withEmail = producers.filter((p) => p.email).length;
      const withWebsite = producers.filter((p) => p.website).length;
      const withRegion = producers.filter((p) => p.region).length;
      log(`  progress ${i + 1}/${targets.length} · email=${withEmail} website=${withWebsite} region=${withRegion}`);
    }
    await sleep(delayMs);
  }

  // Step 3: report / persist
  const summary = {
    scrapedAt: new Date().toISOString(),
    total: producers.length,
    withEmail: producers.filter((p) => p.email).length,
    withWebsite: producers.filter((p) => p.website).length,
    withRegion: producers.filter((p) => p.region).length,
  };
  log(`SUMMARY: ${JSON.stringify(summary)}`);

  if (dryRun) {
    const out = "/tmp/nz-producers-preview.json";
    writeFileSync(out, JSON.stringify({ summary, producers }, null, 2));
    log(`DRY-RUN — no DB writes. Preview: ${out}`);
    log(`sample first 3:`);
    for (const p of producers.slice(0, 3)) log(`  ${JSON.stringify(p)}`);
    return;
  }

  // Step 4: upsert into wine_producers
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");
  const conn = await mysql.createConnection(dbUrl);
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const now = Date.now();
  for (const p of producers) {
    const [rows] = await conn.execute(
      "SELECT id, region, website, email, phase1_source FROM wine_producers WHERE name=? AND country=? LIMIT 1",
      [p.name, p.country]
    );
    if (rows.length > 0) {
      const existing = rows[0];
      // Only fill blanks — never overwrite manual edits.
      const willUpdate =
        (!existing.region && p.region) ||
        (!existing.website && p.website) ||
        (!existing.email && p.email) ||
        (!existing.phase1_source && p.phase1Source);
      if (!willUpdate) {
        skipped += 1;
        continue;
      }
      await conn.execute(
        `UPDATE wine_producers
           SET region = COALESCE(region, ?),
               website = COALESCE(website, ?),
               email = COALESCE(email, ?),
               phase1_source = COALESCE(phase1_source, ?)
         WHERE id = ?`,
        [p.region, p.website, p.email, p.phase1Source, existing.id]
      );
      updated += 1;
    } else {
      await conn.execute(
        `INSERT INTO wine_producers
           (name, country, region, website, email, phase1_source, outreach_status, touch_count, created_at)
         VALUES (?, 'NZ', ?, ?, ?, ?, 'untouched', 0, ?)`,
        [p.name, p.region, p.website, p.email, p.phase1Source, now]
      );
      inserted += 1;
    }
  }
  await conn.end();
  log(`DONE — inserted=${inserted} · updated=${updated} · skipped=${skipped}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
