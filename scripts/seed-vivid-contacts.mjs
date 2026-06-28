/**
 * Seed contacts from the VIVID Event (Cult & Classic) — 6 June 2026.
 * Each contact gets a personalised /hi/:slug landing page.
 *
 * Idempotent: re-runs use INSERT IGNORE so duplicates are skipped.
 *
 * Usage:  node /app/scripts/seed-vivid-contacts.mjs
 *         (or)  /app/node_modules/.bin/tsx /app/scripts/seed-vivid-contacts.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const EVENT = "VIVID Event (Cult & Classic) Jun 2026";

// All contacts captured from the VIVID Wine Stations contact list (pages 2-3).
// Format: [firstName, winery, mobileRaw, region]
const CONTACTS = [
  ["Lou", "P&V + Meredith", "0413 958 717", "Lobby"],
  ["Mem", "P&V + Meredith (Hemmings)", "0434 886 456", "Lobby"],
  ["Nathan", "Brokenwood Wines", "0413 970 167", "Hunter"],
  ["Jane", "Tyrrells", "0408 670 786", "Hunter"],
  ["Ollie", "Margan Wines", "0432 977 226", "Hunter"],
  ["Sarah", "Mount Pleasant", "0491 029 549", "Hunter"],
  ["Allanna", "De Iuliis (Wells)", "02 4993 8000", "Hunter"],
  ["Dan", "M+J Becker Wines (Simmons)", "0456 091 746", "Hunter"],
  ["Michael", "Usher Tinkler", "0412 249 845", "Hunter"],
  ["PJ", "Charteris", "0409 981 385", "Hunter"],
  ["Andrew", "Thomas Wines", "0418 456 853", "Hunter"],
  ["Millie", "Majama (Shorter)", "0438 482 554", "Hunter"],
  ["Rojer", "Majama", "0406 562 502", "Hunter"],
  ["Sarah", "Colmar Estate (Shrapnel)", "0418 208 844", "Orange"],
  ["Jonathon", "Canobolas Wines (Mattick)", "0403 581 312", "Orange"],
  ["Rebecca", "Grape Pirates (Milne)", "0497 133 247", "Orange"],
  ["Sam", "Rosnay (Statham)", "0428 667 317", "Central Ranges"],
  ["Hamish", "Mada Wines (Young)", "0491 818 532", "Canberra"],
  ["Bryan", "Ravensworth Wines (Martin)", "0417 028 335", "Canberra"],
  ["Paul", "Sassafras (Starr)", "0476 413 974", "Canberra"],
  ["Jared", "Jilly Wines (Dixon)", "0414 904 478", "Northern Rivers"],
  ["Tim", "Tim Ward Wines", "0404 222 835", "Various"],
  ["Jan", "Toppers Mountain (Taborsky)", "0431 752 910", "New England"],
  ["Jackie", "Pride of Lunatics (Paradoxa)", "0422 793 327", "—"],
  ["Hamish", "Hopeless Thoughtful", "0478 825 852", "—"],
  ["James", "Audrey Wilkinson / Pooles Rock (Agnew)", "0410 375 045", "Hunter"],
  ["Simon", "Château Acid", "+61 404 201 005", "—"],
  ["Charlie", "Château Acid", "+61 422 215 977", "—"],
  ["Sally", "Ur 1st Luv", "0481 564 796", "—"],
  ["Guillermo", "Archie Rose Spirits (Arnal-Machado)", "+61 411 796 630", "Spirits"],
  ["Matt", "Manly Spirits", "+61 427 732 542", "Spirits"],
];

function slugify(...parts) {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normaliseMobile(raw) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("61")) return `+${digits}`;
  if (digits.startsWith("04") && digits.length === 10) return `+61${digits.slice(1)}`;
  if (digits.startsWith("4") && digits.length === 9) return `+61${digits}`;
  return `+${digits}`;
}

const c = await mysql.createConnection(process.env.DATABASE_URL);

let inserted = 0;
let skipped = 0;
const usedSlugs = new Set();

// Pull existing slugs first so we don't collide on retry
const [existing] = await c.execute("SELECT slug FROM outreach_contacts");
for (const row of existing) usedSlugs.add(row.slug);

for (const [firstName, winery, mobileRaw, region] of CONTACTS) {
  // Build a unique slug: firstname-winery-cleaned, then dedupe within batch
  let slug = slugify(firstName, winery.replace(/\(.*?\)/g, ""));
  if (!slug) slug = slugify(firstName, `vivid-${inserted}`);
  let candidate = slug;
  let n = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${slug}-${n++}`;
  }
  slug = candidate;
  usedSlugs.add(slug);

  const mobile = normaliseMobile(mobileRaw);
  const notes = region && region !== "—" ? `Region: ${region}` : null;

  try {
    await c.execute(
      `INSERT INTO outreach_contacts
        (slug, first_name, winery, mobile_au, event, notes, view_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [slug, firstName, winery, mobile, EVENT, notes, Date.now()]
    );
    inserted++;
    console.log(`  ✓ ${firstName.padEnd(12)} ${winery.padEnd(40)} → /hi/${slug}`);
  } catch (err) {
    if (String(err.message).includes("Duplicate")) {
      skipped++;
      console.log(`  · skipped (duplicate slug): ${slug}`);
    } else {
      console.error(`  ✗ ${firstName} ${winery}:`, err.message);
    }
  }
}

console.log(`\nDone — inserted ${inserted}, skipped ${skipped}, total in DB now:`);
const [final] = await c.execute("SELECT COUNT(*) as n FROM outreach_contacts");
console.log(`  outreach_contacts: ${final[0].n} rows\n`);
await c.end();
