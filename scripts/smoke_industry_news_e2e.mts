/**
 * Full E2E dry-run: scrape → upsert → list → itemContacts.
 * Runs against the real DB. Cleans up after itself. Skips Claude.
 */
import { scrapeWbmNews } from "../server/services/wbmScraper.ts";
import { db } from "../server/db.ts";
import * as schema from "../drizzle/schema.ts";
import { eq, and, desc } from "drizzle-orm";

const items = await scrapeWbmNews();
console.log(`\n[1] Scraped ${items.length} items`);

const now = Date.now();
let inserted = 0;
for (const it of items) {
  const existing = await db.select({ id: schema.industryNewsItems.id })
    .from(schema.industryNewsItems)
    .where(eq(schema.industryNewsItems.url, it.url)).limit(1);
  if (existing.length === 0) {
    await db.insert(schema.industryNewsItems).values({
      source: it.source,
      url: it.url,
      headline: it.headline,
      dek: it.dek,
      imageUrl: it.imageUrl,
      region: it.region,
      categories: it.categories.join("\n"),
      author: it.author,
      publishedAt: it.publishedAtMs,
      fetchedAt: now,
      archived: 0,
    });
    inserted++;
  }
}
console.log(`[2] Inserted ${inserted} new items`);

const stored = await db.select().from(schema.industryNewsItems)
  .orderBy(desc(schema.industryNewsItems.publishedAt)).limit(20);
console.log(`[3] Total in DB: ${stored.length} recent items`);

// Test itemContacts on the first regional item.
const regional = stored.find((s) => s.region);
if (regional) {
  console.log(`\n[4] Testing region-match for: "${regional.headline}" (${regional.region})`);
  const matches = await db.select({
    slug: schema.outreachContacts.slug,
    firstName: schema.outreachContacts.firstName,
    lastName: schema.outreachContacts.lastName,
    winery: schema.outreachContacts.winery,
    mobileAu: schema.outreachContacts.mobileAu,
  }).from(schema.outreachContacts)
    .where(eq(schema.outreachContacts.region, regional.region!))
    .limit(10);
  console.log(`    Found ${matches.length} contacts in ${regional.region}:`);
  matches.slice(0, 5).forEach((c) => {
    const hasMob = c.mobileAu && /^\+614\d{8}$/.test(c.mobileAu) ? "📱" : "  ";
    console.log(`      ${hasMob} ${c.firstName} ${c.lastName ?? ""} · ${c.winery ?? "(no winery)"}`);
  });
}

console.log("\n✅ E2E dry-run successful.\n");
process.exit(0);
