import { z } from "zod";
import { router, protectedProcedure } from "../trpc.js";
import {
  addVintageLogEntry,
  listVintageLogEntries,
  getUsedTankNames,
  deleteVintageLogEntry,
  getUserByOpenId,
  updateTankVolumeOnRacking,
  type EventType,
} from "../db.js";

// ─── Vintage Log Router ───────────────────────────────────────────────────────
// All procedures are protectedProcedure — any authenticated user can log entries.
// Entries are scoped to ctx.user.id so users only see their own log.

const EVENT_TYPES = ["addition", "measurement", "racking", "inoculation", "observation", "pre_harvest_sample", "bottling_run", "weather_event", "other"] as const;

/**
 * Auto-generate searchable tags from event type + details.
 * Called server-side so the client never needs to replicate the logic.
 */
function generateTags(eventType: EventType, details: Record<string, unknown>, variety: string, tankName: string): string[] {
  const tags: string[] = [eventType, variety, tankName];
  if (eventType === "addition") {
    const what = (details.what as string) ?? "";
    if (what) tags.push(what);
    const timing = (details.timing as string) ?? "";
    if (timing) tags.push(timing);
  } else if (eventType === "measurement") {
    const what = (details.what as string) ?? "";
    if (what) tags.push(what);
  } else if (eventType === "racking") {
    tags.push("racking");
    const leesStatus = (details.leesStatus as string) ?? "";
    if (leesStatus) tags.push(leesStatus);
  } else if (eventType === "inoculation") {
    const what = (details.what as string) ?? "";
    if (what) tags.push(what);
    const product = (details.productName as string) ?? "";
    if (product) tags.push(product);
  }
  // Deduplicate and normalise
  return Array.from(new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean)));
}

const vintageLogRouter = router({
  add: protectedProcedure
    .input(
      z.object({
        tankName: z.string().min(1).max(128),
        variety: z.string().min(1).max(128),
        eventType: z.enum(["addition", "measurement", "racking", "inoculation", "observation", "pre_harvest_sample", "bottling_run", "weather_event", "sanitation", "other"]),
        details: z.record(z.string(), z.unknown()),
        noteText: z.string().max(2000).optional(),
        entryAt: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const tags = generateTags(input.eventType, input.details, input.variety, input.tankName);
      const id = await addVintageLogEntry({
        userId: dbUser.id,
        tankName: input.tankName,
        variety: input.variety,
        eventType: input.eventType,
        detailsJson: JSON.stringify(input.details),
        noteText: input.noteText,
        tagsJson: JSON.stringify(tags),
        entryAt: input.entryAt,
      });
      // DR-04: Auto-update live tank volume on Racking events
      if (input.eventType === "racking") {
        const d = input.details as { fromLocation?: string; toLocation?: string; volumeL?: number };
        if (d.fromLocation && d.volumeL) {
          await updateTankVolumeOnRacking(
            dbUser.id,
            d.fromLocation,
            d.toLocation ?? "",
            Number(d.volumeL)
          ).catch(() => { /* non-fatal — volume update is best-effort */ });
        }
      }
      return { success: true, id };
    }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(200).optional() }))
    .query(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) return [];
      const rows = await listVintageLogEntries(dbUser.id, input.limit ?? 50);
      return rows.map((r) => ({
        ...r,
        details: JSON.parse(r.detailsJson) as Record<string, unknown>,
        tags: JSON.parse(r.tagsJson) as string[],
      }));
    }),

  getUsedTanks: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) return [];
    return getUsedTankNames(dbUser.id);
  }),

  /**
   * Real-time alerts engine. Scans the user's recent vintage_log_entries and
   * emits actionable alerts for the cellar floor: DAP due, high temp, stuck
   * ferment, ready-to-rack, tank-gone-quiet. Returns up to 6 alerts ordered
   * by severity.
   */
  alerts: protectedProcedure.query(async ({ ctx }) => {
    const dbUser = await getUserByOpenId(ctx.user.openId);
    if (!dbUser) return { alerts: [] };
    const alerts = await computeAlertsForUser(dbUser.id);
    return { alerts };
  }),

  /**
   * Vintage comparison — distil 2+ tanks' full life cycles into side-by-side
   * stat blocks for a post-vintage debrief.
   *
   * Pure data composition over existing vintage_log_entries — zero new LLM
   * cost, zero schema changes. Powers /the-press/compare.
   */
  compareTanks: protectedProcedure
    .input(z.object({ tankNames: z.array(z.string().min(1)).min(2).max(6) }))
    .query(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) return { tanks: [] };

      const rows = await listVintageLogEntries(dbUser.id, 800);
      const parseDetails = (s: string): Record<string, unknown> => {
        try { return JSON.parse(s) as Record<string, unknown>; } catch { return {}; }
      };

      const tanks = input.tankNames.map((tankName) => {
        const events = rows.filter((r) => r.tankName === tankName);
        if (events.length === 0) {
          return { tankName, found: false, variety: "—", totalEvents: 0 } as const;
        }

        const sortedAsc = [...events].sort((a, b) => a.entryAt - b.entryAt);
        const variety = sortedAsc[0].variety;
        const firstAt = sortedAsc[0].entryAt;
        const lastAt = sortedAsc[sortedAsc.length - 1].entryAt;

        // Measurements
        const measurements = events
          .filter((e) => e.eventType === "measurement")
          .map((e) => ({ at: e.entryAt, d: parseDetails(e.detailsJson) }));
        const brixReadings = measurements
          .filter((m) => String(m.d.what ?? "").toLowerCase() === "brix")
          .map((m) => ({ at: m.at, v: parseFloat(String(m.d.value ?? "")) || 0 }))
          .sort((a, b) => a.at - b.at);
        const tempReadings = measurements
          .filter((m) => ["temperature", "temp"].includes(String(m.d.what ?? "").toLowerCase()))
          .map((m) => parseFloat(String(m.d.value ?? "")) || 0);
        const yanReadings = measurements
          .filter((m) => String(m.d.what ?? "").toLowerCase() === "yan")
          .map((m) => parseFloat(String(m.d.value ?? "")) || 0);
        const phReadings = measurements
          .filter((m) => String(m.d.what ?? "").toLowerCase() === "ph")
          .map((m) => parseFloat(String(m.d.value ?? "")) || 0);

        // Inoculation
        const inoc = events.find((e) => e.eventType === "inoculation");
        const inocDetails = inoc ? parseDetails(inoc.detailsJson) : null;
        const yeastStrain = inocDetails ? String(inocDetails.productName ?? inocDetails.what ?? "—") : "—";
        const inocAt = inoc?.entryAt ?? null;

        // Ferment duration: inoculation → first brix ≤ 2
        let fermentDays: number | null = null;
        if (inocAt) {
          const dryReading = brixReadings.find((b) => b.at >= inocAt && b.v <= 2);
          if (dryReading) fermentDays = (dryReading.at - inocAt) / 86400000;
        }

        // Additions
        const additions = events
          .filter((e) => e.eventType === "addition")
          .map((e) => ({ at: e.entryAt, d: parseDetails(e.detailsJson) }));
        const dapCount = additions.filter((a) => String(a.d.what ?? "").toLowerCase().includes("dap")).length;
        const so2Count = additions.filter((a) => {
          const w = String(a.d.what ?? "").toLowerCase();
          return w.includes("so2") || w.includes("so₂") || w.includes("sulphite") || w.includes("kms") || w.includes("metabisulfite");
        }).length;

        // Decision reasoning ("Why?" entries) — last 5 most recent
        const reasonings: { date: string; eventType: string; reasoning: string }[] = [];
        for (const e of [...events].sort((a, b) => b.entryAt - a.entryAt)) {
          const d = parseDetails(e.detailsJson);
          const r = typeof d.reasoning === "string" ? d.reasoning.trim() : "";
          if (r) {
            reasonings.push({
              date: new Date(e.entryAt).toISOString().slice(0, 10),
              eventType: e.eventType,
              reasoning: r,
            });
          }
          if (reasonings.length >= 5) break;
        }

        return {
          tankName,
          found: true,
          variety,
          totalEvents: events.length,
          firstAt,
          lastAt,
          inocAt,
          yeastStrain,
          fermentDays,
          finalBrix: brixReadings.length ? brixReadings[brixReadings.length - 1].v : null,
          startBrix: brixReadings.length ? brixReadings[0].v : null,
          peakTemp: tempReadings.length ? Math.max(...tempReadings) : null,
          avgTemp: tempReadings.length ? tempReadings.reduce((a, b) => a + b, 0) / tempReadings.length : null,
          minYan: yanReadings.length ? Math.min(...yanReadings) : null,
          maxYan: yanReadings.length ? Math.max(...yanReadings) : null,
          avgPh: phReadings.length ? phReadings.reduce((a, b) => a + b, 0) / phReadings.length : null,
          dapAdditions: dapCount,
          so2Additions: so2Count,
          reasonings,
        } as const;
      });

      return { tanks };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      await deleteVintageLogEntry(input.id, dbUser.id);
      return { success: true };
    }),

  // ── DR-01: Inline AI interpretation of measurement log entries ──────────────
  interpretMeasurement: protectedProcedure
    .input(
      z.object({
        tankName: z.string(),
        variety: z.string(),
        details: z.record(z.string(), z.unknown()),
        // Optional context: recent entries for the same tank
        recentContext: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const detailsText = Object.entries(input.details)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      const systemPrompt = `You are a concise winemaking assistant. Given a measurement log entry, provide a brief (2-4 sentence) professional interpretation. Focus on:
- Whether the reading is within normal range for this stage of winemaking
- Any immediate action recommended (e.g., SO₂ addition, nutrient addition, racking)
- Any risk flag if the value is outside acceptable range
Be direct and practical. Use winemaking terminology. Do not repeat the values back verbatim.`;

      const userMessage = `Tank: ${input.tankName} (${input.variety})
Measurement: ${detailsText}${input.recentContext ? `\nRecent context: ${input.recentContext}` : ""}`;

      const resp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          stream: false,
        }),
      });

      if (!resp.ok) throw new Error("LLM request failed");
      const data = await resp.json();
      const interpretation = data.choices?.[0]?.message?.content ?? "Unable to interpret this measurement.";
      return { interpretation };
    }),

  generateVintageCard: protectedProcedure
    .input(z.object({ batchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");

      // Fetch batch details
      const allBatches = await listWineBatches(dbUser.id);
      const batch = allBatches.find((b) => b.batchId === input.batchId);
      if (!batch) throw new Error("Batch not found");

      // Fetch all log entries for this tank
      const allEntries = (await listVintageLogEntries(dbUser.id, 200)).filter(
        (e) => e.tankName === batch.tankName
      );

      // Build a compact summary of the log
      const logSummary = allEntries
        .slice(0, 40)
        .map((e) => {
          const d = new Date(e.entryAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
          const details = (e as unknown as { details?: Record<string, unknown> }).details ? Object.entries((e as unknown as { details: Record<string, unknown> }).details).map(([k, v]) => `${k}: ${v}`).join(", ") : "";
          return `${d} [${e.eventType}] ${details}${e.noteText ? " — " + e.noteText : ""}`;
        })
        .join("\n");

      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const systemPrompt = `You are a winemaker writing a professional vintage card narrative for a wine batch. Write in an authoritative, evocative style — like a back-label story combined with a technical winemaker's note. Structure your response as:

## Vintage Story
[2-3 sentences: evocative narrative about this vintage, the variety, and the season]

## Winemaking Notes
[3-5 bullet points: key decisions made during fermentation and maturation, referencing actual data from the log]

## Profile
[2-3 sentences: expected flavour profile, structure, and drinking window]

Be specific and use real data from the log. Keep the total length to 200-280 words.`;

      const userMessage = `Batch: ${batch.batchId}\nTank: ${batch.tankName ?? "unknown"}\nVariety: ${batch.variety}\nVolume: ${batch.volumeLitres ? batch.volumeLitres + "L" : "unknown"}\nGrower: ${batch.growerDetails ?? "estate"}\nRegion: ${batch.gi ?? "unknown"}\n\nVintage Log:\n${logSummary || "No log entries recorded yet."}`;

      const resp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          stream: false,
        }),
      });

      if (!resp.ok) throw new Error("LLM request failed");
      const llmData = await resp.json();
      const content = llmData.choices?.[0]?.message?.content ?? "Unable to generate vintage card.";
      return { content };
    }),

  // ── Import: parse raw text (paste or CSV) into structured entries ──────────
  parseFromText: protectedProcedure
    .input(z.object({
      rawText: z.string().min(1).max(50000),
    }))
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const systemPrompt = `You are a winery data extraction assistant. The user will paste raw text from their cellar records — this could be copied from Excel, typed notes, emails, or handwritten notes transcribed.

Extract every cellar event you can identify and return a JSON array of entries. Each entry must have:
- tankName: string (e.g. "Tank 7", "Barrel 12A", "Press Fraction")
- variety: string (e.g. "Shiraz", "Chardonnay", "Cabernet Sauvignon")
- eventType: one of: addition | measurement | racking | inoculation | observation | pre_harvest_sample | bottling_run | weather_event | sanitation | other
- details: object with event-specific fields:
  - addition: { what: string, quantity: string, unit: string, timing?: string }
  - measurement: { what: string, value: string, unit: string }
  - racking: { fromLocation: string, toLocation: string, volumeL?: string, leesStatus?: string }
  - inoculation: { what: string, productName?: string, ratePerHL?: string }
  - observation: { text: string }
  - other: { text: string }
- entryDate: ISO date string (YYYY-MM-DD) if identifiable, otherwise null
- noteText: any additional context not captured in details, or null

Return ONLY a valid JSON array. No markdown, no explanation. If you cannot identify any entries, return [].`;

      const resp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.rawText },
          ],
          stream: false,
        }),
      });
      if (!resp.ok) throw new Error("LLM request failed");
      const llmData = await resp.json();
      const raw = llmData.choices?.[0]?.message?.content ?? "[]";
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const entries = JSON.parse(cleaned);
        return { entries: Array.isArray(entries) ? entries : [] };
      } catch {
        return { entries: [] };
      }
    }),

  // ── Import: parse an image (camera/scan) into structured entries ─────────
  parseFromImage: protectedProcedure
    .input(z.object({
      imageBase64: z.string().min(1),
      mimeType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const systemPrompt = `You are a winery data extraction assistant. The user has photographed their cellar records — this could be a handwritten notebook, whiteboard, printed lab report, or any other document.

Extract every cellar event you can identify from the image and return a JSON array of entries. Each entry must have:
- tankName: string (e.g. "Tank 7", "Barrel 12A")
- variety: string (e.g. "Shiraz", "Chardonnay")
- eventType: one of: addition | measurement | racking | inoculation | observation | pre_harvest_sample | bottling_run | weather_event | sanitation | other
- details: object with event-specific fields:
  - addition: { what: string, quantity: string, unit: string, timing?: string }
  - measurement: { what: string, value: string, unit: string }
  - racking: { fromLocation: string, toLocation: string, volumeL?: string, leesStatus?: string }
  - inoculation: { what: string, productName?: string, ratePerHL?: string }
  - observation: { text: string }
  - other: { text: string }
- entryDate: ISO date string (YYYY-MM-DD) if identifiable, otherwise null
- noteText: any additional context, or null

Return ONLY a valid JSON array. No markdown, no explanation. If you cannot identify any entries, return [].`;

      const resp = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}`, detail: "high" },
                },
                { type: "text", text: "Please extract all cellar log entries from this image." },
              ],
            },
          ],
          stream: false,
        }),
      });
      if (!resp.ok) throw new Error("LLM vision request failed");
      const llmData = await resp.json();
      const raw = llmData.choices?.[0]?.message?.content ?? "[]";
      try {
        const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const entries = JSON.parse(cleaned);
        return { entries: Array.isArray(entries) ? entries : [] };
      } catch {
        return { entries: [] };
      }
    }),

  // ── Import: bulk-save confirmed parsed entries ────────────────────────────
  bulkSave: protectedProcedure
    .input(z.object({
      entries: z.array(z.object({
        tankName: z.string().min(1).max(128),
        variety: z.string().min(1).max(128),
        eventType: z.enum(["addition", "measurement", "racking", "inoculation", "observation", "pre_harvest_sample", "bottling_run", "weather_event", "sanitation", "other"]),
        details: z.record(z.string(), z.unknown()),
        entryDate: z.string().nullable().optional(),
        noteText: z.string().max(2000).nullable().optional(),
      })),
      importSource: z.enum(["paste", "csv", "image"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbUser = await getUserByOpenId(ctx.user.openId);
      if (!dbUser) throw new Error("User not found");
      const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let saved = 0;
      for (const entry of input.entries) {
        const tags = generateTags(entry.eventType, entry.details, entry.variety, entry.tankName);
        const entryAt = entry.entryDate ? new Date(entry.entryDate).getTime() : Date.now();
        await addVintageLogEntry({
          userId: dbUser.id,
          tankName: entry.tankName,
          variety: entry.variety,
          eventType: entry.eventType,
          detailsJson: JSON.stringify(entry.details),
          noteText: entry.noteText ?? undefined,
          tagsJson: JSON.stringify(tags),
          entryAt: isNaN(entryAt) ? Date.now() : entryAt,
          importSource: input.importSource,
          importBatchId: batchId,
        });
        saved++;
      }
      return { saved, batchId };
    }),
});

export { vintageLogRouter };

// ─── Shared Alert Computation ────────────────────────────────────────────────
// Pure function reused by the tRPC alerts query AND the daily-email cron handler.

export type Alert = {
  kind: "dap_due" | "high_temp" | "stuck_ferment" | "ready_to_rack" | "tank_quiet";
  severity: "high" | "medium" | "low";
  tankName: string;
  variety: string;
  title: string;
  detail: string;
  action: string;
};

export async function computeAlertsForUser(userId: number): Promise<Alert[]> {
  const rows = await listVintageLogEntries(userId, 400);
  if (rows.length === 0) return [];

  const byTank = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byTank.has(r.tankName)) byTank.set(r.tankName, []);
    byTank.get(r.tankName)!.push(r);
  }

  const now = Date.now();
  const day = 86400 * 1000;
  const alerts: Alert[] = [];

  function parseDetails(detailsJson: string): Record<string, unknown> {
    try { return JSON.parse(detailsJson) as Record<string, unknown>; } catch { return {}; }
  }

  for (const [tankName, events] of byTank.entries()) {
    const variety = events[0]?.variety ?? "—";
    const newest = events[0];
    const daysSinceNewest = (now - newest.entryAt) / day;
    if (daysSinceNewest > 120) continue;

    const inoculation = events.find((e) => e.eventType === "inoculation");
    const lastRacking = events.find((e) => e.eventType === "racking");
    const measurements = events
      .filter((e) => e.eventType === "measurement")
      .map((e) => ({ at: e.entryAt, d: parseDetails(e.detailsJson) }));
    const additions = events
      .filter((e) => e.eventType === "addition")
      .map((e) => ({ at: e.entryAt, d: parseDetails(e.detailsJson) }));

    // Rule 1: DAP due
    const lastYan = measurements.find((m) => String(m.d.what ?? "").toLowerCase() === "yan");
    if (lastYan) {
      const yanValue = parseFloat(String(lastYan.d.value ?? "")) || 0;
      const dapSinceYan = additions.find(
        (a) => String(a.d.what ?? "").toLowerCase().includes("dap") && a.at >= lastYan.at
      );
      if (yanValue > 0 && yanValue < 200 && !dapSinceYan) {
        alerts.push({
          kind: "dap_due",
          severity: yanValue < 150 ? "high" : "medium",
          tankName, variety,
          title: `${tankName}: DAP due`,
          detail: `YAN at ${yanValue} ppm (below 200 ppm target). No DAP added since measurement.`,
          action: "Add DAP — split addition recommended.",
        });
      }
    }

    // Rule 2: High temp
    const lastTemp = measurements.find((m) => {
      const w = String(m.d.what ?? "").toLowerCase();
      return w === "temperature" || w === "temp";
    });
    if (lastTemp) {
      const temp = parseFloat(String(lastTemp.d.value ?? "")) || 0;
      const ageHrs = (now - lastTemp.at) / (3600 * 1000);
      if (temp > 22 && ageHrs < 24) {
        alerts.push({
          kind: "high_temp",
          severity: temp > 26 ? "high" : "medium",
          tankName, variety,
          title: `${tankName}: High temp (${temp}°C)`,
          detail: `Last reading ${Math.round(ageHrs)}h ago — above 22°C threshold.`,
          action: "Cool ferment — risk of stuck ferment / volatile loss.",
        });
      }
    }

    // Rule 3: Stuck ferment
    const brixSeries = measurements
      .filter((m) => String(m.d.what ?? "").toLowerCase() === "brix")
      .slice(0, 4);
    if (brixSeries.length >= 2 && inoculation) {
      const latest = parseFloat(String(brixSeries[0].d.value ?? "")) || 0;
      const oldest = parseFloat(String(brixSeries[brixSeries.length - 1].d.value ?? "")) || 0;
      const spanDays = (brixSeries[0].at - brixSeries[brixSeries.length - 1].at) / day;
      const delta = oldest - latest;
      if (latest > 4 && spanDays >= 2 && delta < 1) {
        alerts.push({
          kind: "stuck_ferment",
          severity: "high",
          tankName, variety,
          title: `${tankName}: Possible stuck ferment`,
          detail: `Brix moved only ${delta.toFixed(1)}° in ${spanDays.toFixed(1)} days (currently ${latest}°Bx).`,
          action: "Check temp, YAN, and yeast viability. Consider restart protocol.",
        });
      }
    }

    // Rule 4: Ready to rack
    const lastBrix = brixSeries[0];
    if (lastBrix && inoculation) {
      const brix = parseFloat(String(lastBrix.d.value ?? "")) || 0;
      const rackingSinceDry = lastRacking && lastBrix.at < lastRacking.entryAt;
      const ageHrs = (now - lastBrix.at) / (3600 * 1000);
      if (brix <= 2 && brix >= -2 && !rackingSinceDry && ageHrs < 96) {
        alerts.push({
          kind: "ready_to_rack",
          severity: "medium",
          tankName, variety,
          title: `${tankName}: Ready to rack`,
          detail: `Brix at ${brix}°Bx (dry). No racking recorded since.`,
          action: "Plan racking off gross lees.",
        });
      }
    }

    // Rule 5: Tank gone quiet
    if (inoculation && daysSinceNewest > 5 && daysSinceNewest < 14) {
      alerts.push({
        kind: "tank_quiet",
        severity: "low",
        tankName, variety,
        title: `${tankName}: No recent activity`,
        detail: `Last log entry ${Math.round(daysSinceNewest)} days ago. Active vintage tank.`,
        action: "Walk the cellar — check on this tank.",
      });
    }
  }

  const order = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  return alerts.slice(0, 6);
}
