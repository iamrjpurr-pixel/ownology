/**
 * instagramBackfillCore.ts — shared logic for the Instagram handle backfill.
 *
 * Called from TWO places so both surfaces stay in sync:
 *   1. outreach.backfillInstagramHandles tRPC procedure (manual admin button
 *      on /admin/contacts/outbound-queue → advanced tools).
 *   2. /api/scheduled/instagram-backfill nightly cron (dailyAlertEmail-style
 *      handler wired in server/index.ts).
 *
 * Behaviour:
 *   - Scans outreach_contacts where winery is set AND notes has no existing
 *     IG marker (`IG:` / `Instagram:` / `Insta:` / `instagram.com/...`).
 *   - For each candidate (up to `limit`), asks Perplexity Sonar for the
 *     winery's Instagram handle in strict JSON. Perplexity is explicitly
 *     told to return null if unsure, not to guess.
 *   - Validates handle shape against Instagram's rules before writing.
 *     Rejects anything that doesn't match /^[a-z0-9._]{2,30}$/i.
 *   - On success, appends `[auto-IG YYYY-MM-DD] IG: <business>` and
 *     optionally `· IG-personal: @<personal>` to the notes column.
 *   - 200ms sleep between calls to stay under Perplexity's soft rate cap.
 *
 * Cost: ~$0.004 per Sonar query. Default limit 50 → ~$0.20 per run.
 */
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { desc, eq, sql } from "drizzle-orm";

export type BackfillResult = {
  checked: number;
  found: number;
  notFound: number;
  errors: number;
  updates: { slug: string; winery: string | null; business: string | null; personal: string | null }[];
};

const VALID_HANDLE = /^[a-z0-9._]{2,30}$/i;

export async function runInstagramBackfill(limit: number): Promise<BackfillResult> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error("PERPLEXITY_API_KEY not configured");

  const candidates = await db
    .select({
      id: schema.outreachContacts.id,
      slug: schema.outreachContacts.slug,
      firstName: schema.outreachContacts.firstName,
      lastName: schema.outreachContacts.lastName,
      winery: schema.outreachContacts.winery,
      notes: schema.outreachContacts.notes,
    })
    .from(schema.outreachContacts)
    .where(sql`
      winery IS NOT NULL
      AND LENGTH(TRIM(winery)) > 0
      AND (
        notes IS NULL OR (
          notes NOT LIKE '%IG:%'
          AND notes NOT LIKE '%Instagram:%'
          AND notes NOT LIKE '%instagram.com/%'
          AND notes NOT LIKE '%Insta:%'
        )
      )
    `)
    .orderBy(desc(schema.outreachContacts.createdAt))
    .limit(limit);

  const result: BackfillResult = {
    checked: candidates.length,
    found: 0,
    notFound: 0,
    errors: 0,
    updates: [],
  };

  for (const c of candidates) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);
      const wineryLabel = (c.winery ?? "").trim();
      const personLabel = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();

      const prompt = `What is the official Instagram handle for the Australian winery "${wineryLabel}"${personLabel ? ` (winemaker: ${personLabel})` : ""}?

Return a strict JSON object with exactly these fields:
{"business": "<handle-or-null>", "personal": "<handle-or-null>", "confidence": "high|medium|low"}

Rules:
- "business" = the winery's official Instagram handle (no @ prefix, no URL, just the handle text). Prefer the actual winery account, not a distributor or retailer.
- "personal" = the winemaker's personal Instagram handle if clearly distinct from the business one and publicly visible in bios/press. Otherwise null.
- If you cannot find a verified handle, return null. Do NOT guess. Do NOT invent a plausible-sounding handle.
- Handles must match Instagram's rules: 2-30 chars, lowercase letters/numbers/underscores/periods only.
- Return ONLY the JSON object, no prose, no code fences.`;

      let resp: Response;
      try {
        resp = await fetch("https://api.perplexity.ai/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "sonar",
            max_tokens: 200,
            messages: [
              { role: "system", content: "You are a precise research assistant for wine-industry contact discovery. You only return verified Instagram handles you can find in the public web. When unsure, you return null. You never invent handles." },
              { role: "user", content: prompt },
            ],
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!resp.ok) {
        result.errors++;
        console.error(`[ig-backfill] Perplexity ${resp.status} for ${c.slug}`);
        continue;
      }
      const payload = await resp.json() as { choices?: { message?: { content?: string } }[] };
      const raw = payload.choices?.[0]?.message?.content ?? "";
      const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      let parsed: { business?: string | null; personal?: string | null; confidence?: string } | null = null;
      try { parsed = JSON.parse(clean); } catch { /* fall through */ }
      if (!parsed) {
        result.errors++;
        continue;
      }

      const business = typeof parsed.business === "string"
        ? parsed.business.replace(/^@/, "").trim().toLowerCase()
        : null;
      const personal = typeof parsed.personal === "string"
        ? parsed.personal.replace(/^@/, "").trim().toLowerCase()
        : null;

      const businessOk = business && VALID_HANDLE.test(business) ? business : null;
      const personalOk = personal && VALID_HANDLE.test(personal) && personal !== businessOk ? personal : null;

      if (!businessOk && !personalOk) {
        result.notFound++;
        continue;
      }

      const suffix: string[] = [];
      if (businessOk) suffix.push(`IG: ${businessOk}`);
      if (personalOk) suffix.push(`IG-personal: @${personalOk}`);
      const stamp = ` · [auto-IG ${new Date().toISOString().slice(0, 10)}] ${suffix.join(" · ")}`;
      const newNotes = ((c.notes ?? "").trimEnd() + stamp).slice(0, 4000);

      await db
        .update(schema.outreachContacts)
        .set({ notes: newNotes })
        .where(eq(schema.outreachContacts.id, c.id));

      result.found++;
      result.updates.push({
        slug: c.slug,
        winery: c.winery,
        business: businessOk,
        personal: personalOk,
      });

      // Gentle pause so we don't hammer Perplexity's soft rate limit.
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      result.errors++;
      console.error(`[ig-backfill] failed for ${c.slug}:`, (err as Error).message);
    }
  }

  return result;
}
