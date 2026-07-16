#!/usr/bin/env tsx
/**
 * refresh-todo.ts
 *
 * Auto-sync `RECENTLY_SHIPPED` in `/app/client/src/data/todoData.ts` with the
 * latest entries in `/app/memory/CHANGELOG.md`.
 *
 * Rules of the road:
 *  - CHANGELOG.md is source of truth. Parse it. Never invent items.
 *  - We take the N most recent entries (default 8) and rewrite the
 *    `RECENTLY_SHIPPED` array in-place. Everything else in todoData.ts stays
 *    untouched — we do NOT touch the P0/P1/P2 backlog.
 *  - Parse rule: any level-3 heading (`### ...`) with a date pattern (e.g.
 *    "Feb 2026", "Jan 2026") that starts a section, plus a summary line, is
 *    treated as a "shipped item". The first bullet or first paragraph after
 *    the H3 becomes the description.
 *
 * Usage:
 *   tsx scripts/refresh-todo.ts              # rewrite in place
 *   tsx scripts/refresh-todo.ts --dry-run    # print the new array, don't write
 *   tsx scripts/refresh-todo.ts --limit 12   # take 12 most recent instead of 8
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CHANGELOG_PATH = resolve(process.cwd(), "memory/CHANGELOG.md");
const TODO_PATH = resolve(process.cwd(), "client/src/data/todoData.ts");

type ShippedItem = { id: string; title: string; description: string; shippedAt: string };

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit"));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1] || args[args.indexOf(limitArg) + 1] || "8", 10) : 8;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/** Convert "Feb 2026" → "2026-02-15" (assumes mid-month if only month+year given). */
function parseShippedAt(header: string): string {
  const monthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const match = header.match(/(\w{3,})\s+(\d{4})/i);
  if (!match) return new Date().toISOString().slice(0, 10);
  const [, mon, yr] = match;
  const mm = monthMap[mon.toLowerCase().slice(0, 3)] || "01";
  // Mid-month sentinel so ordering stays stable when multiple entries share
  // the same month header. If more precision needed, upgrade to per-entry dates.
  return `${yr}-${mm}-15`;
}

/**
 * Parse CHANGELOG.md into ShippedItems, newest first.
 * Expected structure:
 *   ### Feb 2026 — <Title of the shipped thing>
 *   <first paragraph or bullet becomes the description>
 *   ...
 */
function parseChangelog(md: string): ShippedItem[] {
  const items: ShippedItem[] = [];
  const lines = md.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h3 = line.match(/^###\s+(.+)$/);
    if (!h3) continue;
    const heading = h3[1].trim();

    // Extract title after em-dash if present ("Feb 2026 — Widget shipped")
    const emdashSplit = heading.split(/\s+[—-]\s+/);
    const title = emdashSplit.length > 1 ? emdashSplit.slice(1).join(" — ").trim() : heading;
    const dateHint = emdashSplit[0];

    // Description = first non-blank, non-heading paragraph after the H3
    let description = "";
    for (let j = i + 1; j < Math.min(lines.length, i + 30); j++) {
      const l = lines[j].trim();
      if (l === "") { if (description) break; continue; }
      if (l.startsWith("#")) break;
      const cleaned = l.replace(/^[-*]\s+/, "").replace(/\*\*/g, "").replace(/`([^`]+)`/g, "$1");
      description = description ? description + " " + cleaned : cleaned;
      if (description.length > 320) { description = description.slice(0, 320).trimEnd() + "…"; break; }
    }
    if (!description) description = title;

    items.push({
      id: slugify(title),
      title,
      description,
      shippedAt: parseShippedAt(dateHint),
    });
  }
  return items;
}

/** Serialise a ShippedItem[] to the exact TS format used in todoData.ts */
function serialiseItems(items: ShippedItem[]): string {
  const lines: string[] = ["export const RECENTLY_SHIPPED: ShippedItem[] = ["];
  for (const it of items) {
    lines.push("  {");
    lines.push(`    id: ${JSON.stringify(it.id)},`);
    lines.push(`    title: ${JSON.stringify(it.title)},`);
    lines.push(`    description:`);
    lines.push(`      ${JSON.stringify(it.description)},`);
    lines.push(`    shippedAt: ${JSON.stringify(it.shippedAt)},`);
    lines.push("  },");
  }
  lines.push("];");
  return lines.join("\n");
}

// ─── Main ────────────────────────────────────────────────────────────────────
function main(): void {
  const changelog = readFileSync(CHANGELOG_PATH, "utf8");
  const items = parseChangelog(changelog).slice(0, LIMIT);
  if (items.length === 0) {
    console.error("No items parsed from CHANGELOG.md. Check the H3 format.");
    process.exit(1);
  }
  const newBlock = serialiseItems(items);

  if (dryRun) {
    console.log("─── Would rewrite RECENTLY_SHIPPED with: ───\n");
    console.log(newBlock);
    console.log(`\n─── ${items.length} entries, most recent: ${items[0].title} (${items[0].shippedAt}) ───`);
    return;
  }

  const todo = readFileSync(TODO_PATH, "utf8");
  // Replace the entire `export const RECENTLY_SHIPPED: ShippedItem[] = [ ... ];` block.
  // We anchor on the exact declaration line and consume up to the matching `];`.
  const pattern = /export const RECENTLY_SHIPPED: ShippedItem\[\] = \[[\s\S]*?\n\];/;
  if (!pattern.test(todo)) {
    console.error("Could not locate RECENTLY_SHIPPED array in todoData.ts — has the file structure changed?");
    process.exit(1);
  }
  const next = todo.replace(pattern, newBlock);
  writeFileSync(TODO_PATH, next, "utf8");
  console.log(`✓ RECENTLY_SHIPPED refreshed with ${items.length} entries.`);
  console.log(`  Most recent: ${items[0].title} (${items[0].shippedAt})`);
  console.log(`  Oldest kept: ${items[items.length - 1].title} (${items[items.length - 1].shippedAt})`);
}

main();
