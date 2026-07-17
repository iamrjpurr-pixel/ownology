/**
 * Diagnose why NextBestActionPill isn't showing. Run each rule against
 * a sample of contacts to see how many would produce a pill.
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const now = Date.now();
const DAY = 86_400_000;

const [contacts] = await conn.execute(`
  SELECT slug, first_name, region, mobile_au, status,
    sms_sent_at, sms_draft_override, replied_at, first_viewed_at
  FROM outreach_contacts
  ORDER BY created_at DESC
  LIMIT 50
`);

let rules = { reply: 0, opened: 0, news: 0, send: 0, none: 0 };
const newsByRegion = {};
const [news] = await conn.execute(`
  SELECT region, headline, published_at FROM industry_news_items
  WHERE archived = 0 AND published_at >= ? ORDER BY published_at DESC
`, [now - 14 * DAY]);
for (const n of news) if (n.region) (newsByRegion[n.region] ??= []).push(n);
console.log(`Fresh news items (last 14d) covering regions: ${Object.keys(newsByRegion).join(", ") || "(none)"}\n`);

const wouldShow = [];
for (const c of contacts) {
  const hasMobile = !!(c.mobile_au && /^\+614\d{8}$/.test(c.mobile_au));
  let match = null;

  if (c.replied_at && !c.sms_sent_at) { match = "reply"; rules.reply++; }
  else if (c.first_viewed_at && c.sms_sent_at && c.first_viewed_at > c.sms_sent_at && now - c.first_viewed_at < 21*DAY && now - c.first_viewed_at > 3*DAY) { match = "opened"; rules.opened++; }
  else if (c.region && !c.sms_sent_at && newsByRegion[c.region]?.length) { match = "news"; rules.news++; }
  else if (hasMobile && c.sms_draft_override && !c.sms_sent_at && (c.status ?? "cold") === "cold") { match = "send"; rules.send++; }
  else rules.none++;
  if (match) wouldShow.push(`  ${match.padEnd(6)} ${c.first_name} · ${c.region ?? "-"} · mobile=${hasMobile?"y":"n"} · draft=${c.sms_draft_override?"y":"n"} · sent=${c.sms_sent_at?"y":"n"}`);
}

console.log(`Sample of 50 contacts:`);
console.log(`  reply-back (hot):       ${rules.reply}`);
console.log(`  opened-link followup:   ${rules.opened}`);
console.log(`  news-match:             ${rules.news}`);
console.log(`  send-ready:             ${rules.send}`);
console.log(`  no pill (silent):       ${rules.none}   ← if this is high, pill rules too strict`);
console.log(`\nWould-show detail (first 20):`);
wouldShow.slice(0, 20).forEach((l) => console.log(l));

await conn.end();
