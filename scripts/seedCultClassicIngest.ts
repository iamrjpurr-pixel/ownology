/**
 * One-shot seed: log the Cult & Classic Humanitix event as an ingested
 * event for provenance. This is where Rich landed his first 32 contacts.
 *
 * Run with:  cd /app && DOTENV_CONFIG_PATH=.env npx tsx -r dotenv/config scripts/seedCultClassicIngest.ts
 *
 * Idempotent — upserts on URL. Producer list intentionally left empty so
 * the operator can click "re-parse" in /admin/event-ingest to get a
 * full LLM extraction of the current producer roster.
 */

import "dotenv/config";
import { db } from "../server/db.js";
import * as schema from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

const URL = "https://events.humanitix.com/cult-and-classic";
const EVENT_NAME = "Cult & Classic";
const CITY = "Sydney"; // Humanitix listing is a Sydney trade tasting
const EVENT_KIND = "trade_tasting";
const NOTE = "First 32 Ownology outreach contacts came from this event (attribution — Rich, Feb 2026).";

async function main() {
  const now = Date.now();

  const existing = await db
    .select({ id: schema.eventIngests.id })
    .from(schema.eventIngests)
    .where(eq(schema.eventIngests.url, URL))
    .limit(1);

  if (existing[0]?.id) {
    await db
      .update(schema.eventIngests)
      .set({
        eventName: EVENT_NAME,
        city: CITY,
        ticketsUrl: URL,
        eventKind: EVENT_KIND,
        updatedAt: now,
        lastUsedAt: now,
      })
      .where(eq(schema.eventIngests.url, URL));
    console.log(`[seed] Updated existing event_ingests row id=${existing[0].id}`);
  } else {
    const result = await db.insert(schema.eventIngests).values({
      url: URL,
      eventName: EVENT_NAME,
      eventDateIso: null,
      eventDateDisplay: null,
      venue: null,
      address: null,
      city: CITY,
      ticketsUrl: URL,
      eventKind: EVENT_KIND,
      producersJson: JSON.stringify([]),
      producerCount: 0,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
    });
    const raw = result as unknown as { insertId?: number } | Array<{ insertId?: number }>;
    const insertId = Array.isArray(raw) ? raw[0]?.insertId : raw?.insertId;
    console.log(`[seed] Inserted event_ingests row id=${insertId}  · ${EVENT_NAME}  · ${NOTE}`);
  }

  console.log("[seed] Tip: open /admin/event-ingest and paste the URL to run the LLM parse for a full producer roster.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
