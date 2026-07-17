/**
 * Quick smoke test: run the WBM scraper standalone and dump the first
 * few parsed items. Doesn't touch the DB. Runs against the live URL
 * so it will occasionally fail if Cloudflare gates us — retry.
 */
import { scrapeWbmNews } from "../server/services/wbmScraper.ts";

const items = await scrapeWbmNews();
console.log(`\nScraped ${items.length} items from WBM\n`);
for (const it of items.slice(0, 5)) {
  console.log("─".repeat(80));
  console.log(`HEADLINE: ${it.headline}`);
  console.log(`URL:      ${it.url}`);
  console.log(`REGION:   ${it.region ?? "(none)"}`);
  console.log(`CATS:     ${it.categories.join(", ")}`);
  console.log(`AUTHOR:   ${it.author}`);
  console.log(`DATE:     ${new Date(it.publishedAtMs).toISOString()}`);
  console.log(`DEK:      ${(it.dek ?? "").slice(0, 100)}`);
}
console.log("─".repeat(80));
