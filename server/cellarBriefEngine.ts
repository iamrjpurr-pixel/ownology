/**
 * Cellar Brief engine — Feb 2026.
 *
 * Generates an actionable, structured "what to do today" brief per active
 * vessel (tank or barrel) for a given winery. Rules-based + deterministic
 * for the per-card content; LLM only writes the 2-sentence executive
 * summary at the top.
 *
 * Lifecycle stages this engine recognises:
 *   pre_ferment      — cold soak / pre-yeast (0-2 days post-receival)
 *   primary_active   — yeast in, Brix dropping >2°/day
 *   primary_slowing  — Brix < 5° or slope flattening
 *   pressed          — post-press, MLF pending
 *   mlf_active       — MLF inoculated, no completion event yet
 *   aging_tank       — finished primary+MLF, in tank >30 days, pre-bottling
 *   aging_barrel     — finished primary+MLF, in barrel >30 days
 *   bottled          — bottling event recorded
 *   unknown          — insufficient data
 *
 * Why rules-based for cards? Cellar hands need to TRUST these. LLM
 * hallucination in a regulated context is a non-starter. Each rule is
 * auditable, deterministic, and explainable.
 */

import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { and, eq, gte, desc } from "drizzle-orm";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CellarBriefStage =
  | "pre_ferment"
  | "primary_active"
  | "primary_slowing"
  | "pressed"
  | "mlf_active"
  | "aging_tank"
  | "aging_barrel"
  | "bottled"
  | "unknown";

export type CellarBriefStatus = "ok" | "watch" | "attention";

export type CellarBriefGhostQuestion = {
  id: number;
  question: string;
  answer: string | null;
  category: string | null;
  difficulty: string;
};

export type CellarBriefCard = {
  vesselId: string;
  vesselType: "tank" | "barrel";
  variety: string;
  stage: CellarBriefStage;
  stageLabel: string;
  daysInStage: number;
  status: CellarBriefStatus;
  trajectory: string;
  todaysWork: string[];
  decisionDue: string | null;
  grounding: string[];
  // Surfaced under the card as a "Worth knowing" Q+A teaching block.
  // null when no ghost question matches this stage × wine_color.
  ghostQuestion: CellarBriefGhostQuestion | null;
};

export type CellarBriefSummary = {
  execSummary: string;
  attentionCount: number;
  decisionsDueCount: number;
  tankCount: number;
  cards: CellarBriefCard[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ONE_DAY_MS = 86_400_000;

const STAGE_LABELS: Record<CellarBriefStage, string> = {
  pre_ferment: "Pre-ferment / cold soak",
  primary_active: "Primary active",
  primary_slowing: "Primary slowing",
  pressed: "Pressed, MLF pending",
  mlf_active: "MLF active",
  aging_tank: "Tank ageing",
  aging_barrel: "Barrel ageing",
  bottled: "Bottled",
  unknown: "Unknown",
};

/**
 * Wine-color inference from variety name. Drives the entire stage classifier
 * and grounding-ref selection: whites press BEFORE primary (no cap, no skin
 * maceration), reds press AFTER primary (cap management, extended maceration
 * optional). Rosé treated as a mid-stage: short skin contact then white-like
 * primary. Orange/skin-contact white = red flow.
 */
export type WineColor = "red" | "white" | "rose" | "skin_contact_white";

const RED_VARIETIES = new Set([
  "shiraz", "syrah", "cabernet sauvignon", "cabernet", "cab sauv", "merlot",
  "pinot noir", "pinot", "grenache", "tempranillo", "sangiovese", "malbec",
  "nebbiolo", "barbera", "zinfandel", "primitivo", "carmenere", "mourvedre",
  "mourvèdre", "petit verdot", "touriga", "nero d'avola", "montepulciano",
  "gamay", "cinsault", "cinsaut", "carignan", "graciano", "petite sirah",
]);
const WHITE_VARIETIES = new Set([
  "chardonnay", "sauvignon blanc", "sauv blanc", "savvy b", "riesling",
  "pinot gris", "pinot grigio", "semillon", "sémillon", "viognier",
  "marsanne", "roussanne", "chenin blanc", "gewurztraminer", "gewürztraminer",
  "verdejo", "verdelho", "vermentino", "albarino", "albariño", "fiano",
  "garganega", "moscato", "muscat", "trebbiano", "ugni blanc", "arneis",
  "gruner veltliner", "grüner veltliner", "macabeo", "viura",
]);
const ROSE_HINTS = ["rose", "rosé", "rosato", "blush"];

export function inferWineColor(variety: string): WineColor {
  const v = variety.toLowerCase().trim();
  // Explicit rosé / orange hints first
  if (ROSE_HINTS.some((h) => v.includes(h))) return "rose";
  if (v.includes("orange") || v.includes("skin contact") || v.includes("skin-contact") || v.includes("amber")) return "skin_contact_white";
  // Direct match
  if (RED_VARIETIES.has(v)) return "red";
  if (WHITE_VARIETIES.has(v)) return "white";
  // Partial match — handle blends like "Cab Sauv / Shiraz" or "Sauv Blanc — Semillon"
  for (const r of Array.from(RED_VARIETIES)) if (v.includes(r)) return "red";
  for (const w of Array.from(WHITE_VARIETIES)) if (v.includes(w)) return "white";
  // Last-ditch heuristic: tokens like "white", "rouge", "noir"
  if (v.includes("white") || v.includes("blanc")) return "white";
  if (v.includes("noir") || v.includes("rouge") || v.includes("red")) return "red";
  // Default to red — reds are the dominant Australian boutique production
  // and the red flow is the more conservative classifier (it expects a
  // press event mid-stage that the white flow ignores).
  return "red";
}

// ─── WBS taxonomy bridge ─────────────────────────────────────────────────────
//
// Every Cellar Brief stage maps to one or more WBS process families. Those
// codes are the join key to sop_library + diy_knowledge_chunks, which lets
// us hydrate grounding refs dynamically per (stage × wine_color) instead of
// hardcoding "SOP 11" strings that drift out of sync as the library grows.
//
// Stage → WBS code mapping is intentionally narrow: only the codes whose
// content is actionable for that stage. e.g. SO₂ at Crush (3.3) is only
// listed in pre_ferment because that's when winemakers act on it.

const STAGE_TO_WBS: Record<CellarBriefStage, { red: string[]; white: string[] }> = {
  pre_ferment: {
    // Reds = cold-soak with skins (3.1) + crush SO2 (3.3)
    red:   ["3.1", "3.3", "4.2"],
    // Whites = press immediately (4.6), settle/rack (5.3), bench acidity (8.1)
    white: ["4.6", "5.3", "8.1", "4.2"],
  },
  primary_active: {
    red:   ["4.1", "4.3"],
    white: ["4.1", "4.3"],
  },
  primary_slowing: {
    red:   ["4.1", "4.4", "8.1"],
    white: ["4.1", "4.4", "8.1"],
  },
  pressed:        { red: ["4.6", "4.8"], white: ["4.6", "4.8"] },
  mlf_active:     { red: ["4.8"],        white: ["4.8"] },
  aging_tank:     { red: ["5.2", "5.3"], white: ["5.3", "6.1"] },
  aging_barrel:   { red: ["5.1", "5.2", "5.4"], white: ["5.1", "5.4", "6.1"] },
  bottled:        { red: ["7.1"], white: ["7.1"] },
  unknown:        { red: [], white: [] },
};

/**
 * Resolves the WBS codes for a (stage × color) tuple into human-readable
 * grounding labels. Returns at most 3 SOPs and 2 Wine Bible chapters per
 * card (any more crowds the UI and dilutes signal).
 *
 * Pre-fetches the entire SOP library + bible chapter index once per brief
 * generation (passed in via the cache param) so we don't N+1 query.
 */
type WbsCache = {
  sopsByWbs: Map<string, Array<{ id: number; title: string }>>;
  chunksByWbs: Map<string, Array<{ source: string; chapterRef: string; chapterTitle: string }>>;
  // Ghost questions indexed by `${wbsCode}::${wineType}`. wine_type is
  // one of "red" | "white" | "general" — surfaced under each card as
  // a teaching Q+A block.
  ghostsByKey: Map<string, CellarBriefGhostQuestion[]>;
};

function resolveGrounding(stage: CellarBriefStage, color: WineColor, cache: WbsCache): string[] {
  const treatAsWhite = color === "white" || color === "rose";
  const baseCodes = STAGE_TO_WBS[stage]?.[treatAsWhite ? "white" : "red"] ?? [];
  // White Wine Bible chunks were ingested with `D`-prefixed WBS codes
  // (D4.1, D5.2, …) while SOPs + Red Wine Bible use bare codes (4.1, 5.2).
  // For whites/rosé we probe BOTH variants so chapter resolution works
  // regardless of which ingestion script tagged the chunk.
  const wbsCodes = treatAsWhite
    ? baseCodes.flatMap((c) => [c, `D${c}`])
    : baseCodes;
  const out: string[] = [];
  const seenSop = new Set<number>();
  const seenChunk = new Set<string>();
  // SOPs first (most actionable for a cellar hand)
  for (const code of wbsCodes) {
    const sops = cache.sopsByWbs.get(code) ?? [];
    for (const s of sops) {
      if (seenSop.has(s.id)) continue;
      seenSop.add(s.id);
      out.push(`SOP ${s.id} ${s.title}`);
      if (out.filter((l) => l.startsWith("SOP")).length >= 3) break;
    }
    if (out.filter((l) => l.startsWith("SOP")).length >= 3) break;
  }
  // Bible chapters — filter by colour at the chapter level
  const SOURCE_LABEL: Record<string, string> = {
    red_wine_bible: "Red Wine Bible",
    white_wine_bible: "White Wine Bible",
    morew_red_outline: "Red Wine Outline",
    morew_white_outline: "White Wine Outline",
  };
  const preferred = treatAsWhite ? ["white_wine_bible", "morew_white_outline"] : ["red_wine_bible", "morew_red_outline"];
  for (const code of wbsCodes) {
    const chunks = cache.chunksByWbs.get(code) ?? [];
    const filtered = chunks
      .filter((c) => preferred.includes(c.source))
      .sort((a, b) => preferred.indexOf(a.source) - preferred.indexOf(b.source));
    for (const c of filtered) {
      const key = `${c.source}:${c.chapterRef}`;
      if (seenChunk.has(key)) continue;
      seenChunk.add(key);
      const refTrim = String(c.chapterRef).replace(/^Ch/i, "").trim();
      const refDisplay = /^\d/.test(refTrim) ? `Ch.${refTrim}` : (refTrim || c.chapterRef);
      out.push(`${SOURCE_LABEL[c.source] ?? c.source} ${refDisplay} — ${c.chapterTitle}`);
      if (out.filter((l) => !l.startsWith("SOP")).length >= 2) break;
    }
    if (out.filter((l) => !l.startsWith("SOP")).length >= 2) break;
  }
  return out;
}

async function buildWbsCache(): Promise<WbsCache> {
  const sopRows = await db
    .select({ id: schema.sopLibrary.id, title: schema.sopLibrary.title, wbsCode: schema.sopLibrary.wbsCode })
    .from(schema.sopLibrary)
    .where(eq(schema.sopLibrary.published, true));
  const sopsByWbs = new Map<string, Array<{ id: number; title: string }>>();
  for (const r of sopRows) {
    if (!r.wbsCode) continue;
    let arr = sopsByWbs.get(r.wbsCode);
    if (!arr) { arr = []; sopsByWbs.set(r.wbsCode, arr); }
    arr.push({ id: r.id, title: r.title });
  }
  const chunkRows = await db
    .selectDistinct({
      source: schema.diyKnowledgeChunks.sourceDoc,
      chapterRef: schema.diyKnowledgeChunks.chapterRef,
      chapterTitle: schema.diyKnowledgeChunks.chapterTitle,
      wbsCode: schema.diyKnowledgeChunks.wbsCode,
    })
    .from(schema.diyKnowledgeChunks);
  const chunksByWbs = new Map<string, Array<{ source: string; chapterRef: string; chapterTitle: string }>>();
  for (const r of chunkRows) {
    if (!r.wbsCode || !r.source || !r.chapterRef) continue;
    let arr = chunksByWbs.get(r.wbsCode);
    if (!arr) { arr = []; chunksByWbs.set(r.wbsCode, arr); }
    arr.push({ source: r.source, chapterRef: r.chapterRef, chapterTitle: r.chapterTitle ?? "" });
  }
  // Ghost questions — active only. Indexed by `${wbsCode}::${wineType}` for
  // O(1) pickGhostQuestion lookup.
  const ghostRows = await db
    .select({
      id: schema.ghostQuestions.id,
      wbsCode: schema.ghostQuestions.wbsCode,
      wineType: schema.ghostQuestions.wineType,
      question: schema.ghostQuestions.question,
      answer: schema.ghostQuestions.answer,
      journalSlug: schema.ghostQuestions.journalSlug,
      category: schema.ghostQuestions.category,
      difficulty: schema.ghostQuestions.difficulty,
    })
    .from(schema.ghostQuestions)
    .where(eq(schema.ghostQuestions.active, true));
  const ghostsByKey = new Map<string, CellarBriefGhostQuestion[]>();
  for (const r of ghostRows) {
    if (!r.wbsCode || !r.wineType) continue;
    const key = `${r.wbsCode}::${r.wineType}`;
    let arr = ghostsByKey.get(key);
    if (!arr) { arr = []; ghostsByKey.set(key, arr); }
    arr.push({
      id: r.id,
      question: r.question,
      answer: r.answer,
      journalSlug: r.journalSlug,
      category: r.category,
      difficulty: r.difficulty,
    });
  }
  return { sopsByWbs, chunksByWbs, ghostsByKey };
}

/**
 * Picks one ghost question relevant to (stage × wine_color). Prefers
 * questions tagged with the exact wine type ("red" / "white") and falls
 * back to "general". Vessel-stable: same vessel sees the same question
 * within a single brief, but rotation across briefs is acceptable.
 *
 * Returns null if no question matches — caller treats that as "no
 * teaching block on this card".
 */
function pickGhostQuestion(
  vesselId: string,
  stage: CellarBriefStage,
  color: WineColor,
  cache: WbsCache,
): CellarBriefGhostQuestion | null {
  const treatAsWhite = color === "white" || color === "rose";
  const wbsCodes = STAGE_TO_WBS[stage]?.[treatAsWhite ? "white" : "red"] ?? [];
  if (wbsCodes.length === 0) return null;
  const wineTypePref = treatAsWhite ? "white" : "red";
  // Collect candidate pool: exact-wine-type matches first, then general.
  const pool: CellarBriefGhostQuestion[] = [];
  for (const code of wbsCodes) {
    pool.push(...(cache.ghostsByKey.get(`${code}::${wineTypePref}`) ?? []));
  }
  if (pool.length === 0) {
    for (const code of wbsCodes) {
      pool.push(...(cache.ghostsByKey.get(`${code}::general`) ?? []));
    }
  }
  if (pool.length === 0) return null;
  // Vessel-stable deterministic pick — same vessel always gets the same
  // question within one brief, but two adjacent vessels get different ones.
  let hash = 0;
  for (let i = 0; i < vesselId.length; i++) hash = (hash * 31 + vesselId.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % pool.length;
  return pool[idx];
}

type LogEntry = typeof schema.vintageLogEntries.$inferSelect;

function parseDetails(e: LogEntry): Record<string, unknown> {
  try { return JSON.parse(e.detailsJson ?? "{}") as Record<string, unknown>; } catch { return {}; }
}

function numericValue(e: LogEntry): number | null {
  const d = parseDetails(e);
  const v = d.value;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  return null;
}

function isBrixMeasurement(e: LogEntry): boolean {
  if (e.eventType !== "measurement") return false;
  const d = parseDetails(e);
  const what = String(d.what ?? "").toLowerCase();
  return what.includes("brix") || what.includes("sg") || what.includes("specific gravity");
}

function isYanMeasurement(e: LogEntry): boolean {
  if (e.eventType !== "measurement") return false;
  const what = String(parseDetails(e).what ?? "").toLowerCase();
  return what.includes("yan") || what.includes("dap");
}

// ─── Stage classifier ─────────────────────────────────────────────────────────

/**
 * Classify a vessel's current stage from its event history. Order of
 * checks is important — later events win.
 *
 * Variety colour matters: WHITES press immediately at receival (Day 0–1)
 * and ferment juice-only with no cap, no maceration. The pre-inoculation
 * press event is NOT a "primary → aging" boundary for whites — it's the
 * starting line. We treat any press event that happens BEFORE yeast
 * inoculation as a "white-flow press" and ignore it for stage routing.
 *
 * REDS press AFTER primary fermentation, on or near dryness. That press
 * IS the boundary into MLF/aging.
 */
export function classifyStage(events: LogEntry[], color: WineColor = "red"): { stage: CellarBriefStage; stageStartAt: number } {
  if (events.length === 0) return { stage: "unknown", stageStartAt: Date.now() };
  // Events ordered DESC by entryAt; newest first.
  const newestFirst = [...events].sort((a, b) => b.entryAt - a.entryAt);

  // Look for stage-defining events working backwards from now.
  let bottlingAt: number | null = null;
  let pressAt: number | null = null;
  let mlfStartAt: number | null = null;
  let inoculationAt: number | null = null;
  let firstEventAt: number | null = null;

  for (const e of newestFirst) {
    const d = parseDetails(e);
    const what = String(d.what ?? "").toLowerCase();
    const evt = e.eventType;
    if (!firstEventAt || e.entryAt < firstEventAt) firstEventAt = e.entryAt;
    // Bottling — terminal
    if (evt === "racking" && (what.includes("bottle") || /bottl/i.test(e.noteText ?? ""))) {
      bottlingAt = bottlingAt === null ? e.entryAt : Math.max(bottlingAt, e.entryAt);
    }
    // Press
    if (evt === "racking" && (what.includes("press") || /press/i.test(e.noteText ?? ""))) {
      pressAt = pressAt === null ? e.entryAt : Math.max(pressAt, e.entryAt);
    }
    // MLF inoculation
    if (evt === "inoculation" && /mlf|malolactic|oenococcus/i.test(String(d.productName ?? "") + " " + (e.noteText ?? ""))) {
      mlfStartAt = mlfStartAt === null ? e.entryAt : Math.max(mlfStartAt, e.entryAt);
    }
    // Yeast inoculation (primary)
    if (evt === "inoculation" && !/mlf|malolactic|oenococcus/i.test(String(d.productName ?? "") + " " + (e.noteText ?? ""))) {
      inoculationAt = inoculationAt === null ? e.entryAt : Math.max(inoculationAt, e.entryAt);
    }
  }

  const oldestEntryAt = events.reduce((min, e) => Math.min(min, e.entryAt), Date.now());

  // Bottled — terminal.
  if (bottlingAt !== null) return { stage: "bottled", stageStartAt: bottlingAt };

  // ── WHITE / ROSÉ flow ────────────────────────────────────────────────
  // For whites, a press event BEFORE inoculation is the receival press,
  // not a stage transition. Only count press events that happen AFTER
  // inoculation (which is unusual for whites — bench press / cleanup).
  const isWhiteLike = color === "white" || color === "rose";
  const effectivePressAt = isWhiteLike && pressAt !== null && inoculationAt !== null && pressAt < inoculationAt
    ? null   // ignore pre-inoc press for whites
    : pressAt;

  // Post-press: pressed → MLF → aging  (RED path, or post-inoc press)
  if (effectivePressAt !== null) {
    const daysSincePress = (Date.now() - effectivePressAt) / ONE_DAY_MS;
    if (mlfStartAt !== null && mlfStartAt > effectivePressAt) {
      const malicComplete = newestFirst.find((e) => {
        const d = parseDetails(e);
        const what = String(d.what ?? "").toLowerCase();
        return what.includes("malic") && (numericValue(e) ?? 99) < 0.3;
      });
      const daysSinceMlf = (Date.now() - mlfStartAt) / ONE_DAY_MS;
      if (malicComplete || daysSinceMlf > 28) {
        const isBarrel = /barrel|hogshead|puncheon|hbd|fb/i.test(
          (newestFirst[0]?.noteText ?? "") + " " + (newestFirst[0]?.tankName ?? "")
        );
        return { stage: isBarrel ? "aging_barrel" : "aging_tank", stageStartAt: malicComplete?.entryAt ?? mlfStartAt + 28 * ONE_DAY_MS };
      }
      return { stage: "mlf_active", stageStartAt: mlfStartAt };
    }
    if (daysSincePress > 30) {
      const isBarrel = /barrel|hogshead|puncheon|hbd|fb/i.test(
        (newestFirst[0]?.noteText ?? "") + " " + (newestFirst[0]?.tankName ?? "")
      );
      return { stage: isBarrel ? "aging_barrel" : "aging_tank", stageStartAt: effectivePressAt + 30 * ONE_DAY_MS };
    }
    return { stage: "pressed", stageStartAt: effectivePressAt };
  }

  // No press event (red pre-press OR white at any point) — pre-press / primary
  if (inoculationAt !== null) {
    const brixEvents = newestFirst.filter(isBrixMeasurement);
    const latestBrix = brixEvents[0] ? numericValue(brixEvents[0]) : null;
    if (latestBrix !== null && latestBrix < 5) {
      return { stage: "primary_slowing", stageStartAt: inoculationAt };
    }
    return { stage: "primary_active", stageStartAt: inoculationAt };
  }

  // No inoculation event yet:
  //   - RED: cold soak with skins (pre_ferment)
  //   - WHITE: juice settling / debourbage post-press, OR truly pre-press
  // Either way `pre_ferment` is the right bucket; buildCard branches on
  // color to render the right todaysWork.
  return { stage: "pre_ferment", stageStartAt: oldestEntryAt };
}

// ─── Brix trajectory analysis ─────────────────────────────────────────────────

/**
 * Compute slope of recent Brix measurements (°Bx per day). Uses the last
 * 5 measurements within the past 5 days. Returns null if insufficient data.
 */
function brixSlope(events: LogEntry[]): { slope: number | null; latestValue: number | null; pointCount: number } {
  const since = Date.now() - 5 * ONE_DAY_MS;
  const brix = events
    .filter(isBrixMeasurement)
    .filter((e) => e.entryAt >= since)
    .map((e) => ({ at: e.entryAt, v: numericValue(e) }))
    .filter((p): p is { at: number; v: number } => p.v !== null)
    .sort((a, b) => a.at - b.at)
    .slice(-5);
  if (brix.length < 2) return { slope: null, latestValue: brix[brix.length - 1]?.v ?? null, pointCount: brix.length };
  // Simple slope: (last - first) / (days between)
  const days = (brix[brix.length - 1].at - brix[0].at) / ONE_DAY_MS;
  if (days < 0.25) return { slope: null, latestValue: brix[brix.length - 1].v, pointCount: brix.length };
  // Brix goes DOWN during ferment, so a healthy ferment has a negative slope.
  // We report the absolute drop-per-day for human readability.
  const slope = (brix[0].v - brix[brix.length - 1].v) / days;
  return { slope, latestValue: brix[brix.length - 1].v, pointCount: brix.length };
}

// ─── Card builder per stage ───────────────────────────────────────────────────

function buildCard(
  vesselId: string,
  vesselType: "tank" | "barrel",
  variety: string,
  color: WineColor,
  events: LogEntry[],
  stageInfo: { stage: CellarBriefStage; stageStartAt: number },
  wbsCache: WbsCache,
): CellarBriefCard {
  const { stage, stageStartAt } = stageInfo;
  const daysInStage = Math.max(0, Math.floor((Date.now() - stageStartAt) / ONE_DAY_MS));
  const isWhite = color === "white";
  const isRose = color === "rose";

  let status: CellarBriefStatus = "ok";
  let trajectory = "Insufficient data";
  const todaysWork: string[] = [];
  let decisionDue: string | null = null;
  // Grounding refs are resolved from the WBS taxonomy at the end of the
  // switch, so they pick up variety-correct SOPs + Wine Bible chapters
  // automatically from the DB rather than hardcoded strings drifting.
  const grounding: string[] = resolveGrounding(stage, color, wbsCache);

  if (stage === "pre_ferment") {
    if (isWhite || isRose) {
      trajectory = daysInStage <= 1
        ? "Juice settling (debourbage) — pre-inoculation"
        : `Settling day ${daysInStage} — lees clarification in progress`;
      todaysWork.push("Hold cold (8–12°C) to maintain juice clarity");
      todaysWork.push("Check turbidity (target ~NTU 100–200 for inoculation)");
      todaysWork.push("Sample for YAN, pH, TA before inoculation");
      if (daysInStage >= 2) {
        decisionDue = "Inoculation window open — rack off gross lees, then inoculate";
        status = "watch";
      }
    } else {
      trajectory = daysInStage <= 1
        ? "Cold soak in progress"
        : `Cold soak day ${daysInStage} — colour & tannin extraction continuing`;
      if (daysInStage >= 2) {
        todaysWork.push("Inoculate yeast (rehydrate 10× weight in water at 38°C)");
        decisionDue = "Yeast addition window open — inoculate within 24h";
        status = "watch";
      } else {
        todaysWork.push("Monitor temperature (target 8–14°C for cold soak)");
        todaysWork.push("Cap punch-down 2× daily for colour extraction");
      }
    }
  } else if (stage === "primary_active") {
    const { slope, latestValue, pointCount } = brixSlope(events);
    if (latestValue !== null && slope !== null) {
      const slopeStr = `${slope.toFixed(1)}°Bx/day`;
      // White ferments are slower at cooler temps — healthy band is wider on slow side
      const slopeHealth = isWhite
        ? (slope >= 0.8 && slope <= 4.0)
        : (slope >= 1.5 && slope <= 6.0);
      trajectory = `Brix ${latestValue.toFixed(1)} · dropping ${slopeStr} ${slopeHealth ? "(healthy)" : slope < (isWhite ? 0.8 : 1.5) ? "(slow — watch)" : "(fast)"}`;
      if (!slopeHealth && slope < (isWhite ? 0.8 : 1.5)) status = "attention";
      else if (!slopeHealth) status = "watch";
      if (isWhite || isRose) {
        todaysWork.push("Brix + temperature sample 2× today (cooler-fermented whites need close watch)");
        todaysWork.push("Hold target temperature (12–16°C aromatic whites; 14–18°C Chardonnay)");
      } else {
        todaysWork.push("Pump-over 2× today (morning + evening)");
        todaysWork.push("Brix + temperature sample at 12:00");
      }
      if (latestValue < 8) {
        const daysToDry = Math.max(1, Math.ceil(latestValue / Math.max(slope, 0.5)));
        decisionDue = isWhite || isRose
          ? `Ferment finishing — projected dry in ${daysToDry} days · plan racking off gross lees + SO₂ addition`
          : `Press window approaching — projected dry in ${daysToDry} days`;
      }
    } else {
      trajectory = pointCount === 1 ? "Single Brix reading — need second sample for trajectory" : "No recent Brix readings";
      status = "watch";
      todaysWork.push("Take Brix + temperature reading TODAY (twice-daily during active ferment)");
    }
    const lastYan = events.filter(isYanMeasurement).sort((a, b) => b.entryAt - a.entryAt)[0];
    if (!lastYan) {
      todaysWork.push("YAN check overdue — measure to confirm yeast nutrition adequate");
    }
  } else if (stage === "primary_slowing") {
    const { slope, latestValue } = brixSlope(events);
    if (latestValue !== null) {
      trajectory = `Brix ${latestValue.toFixed(1)} · ferment finishing${slope !== null ? ` (${slope.toFixed(1)}°Bx/day)` : ""}`;
    }
    if (slope !== null && slope < 0.3 && latestValue !== null && latestValue > 1) {
      status = "attention";
      decisionDue = "Possible stuck ferment — verify temperature, taste for off-notes, plan restart if no movement in 24h";
      todaysWork.push("⚠ Take Brix every 12h until pressed or dry");
      todaysWork.push("Smell-check for VA / H₂S / reductive notes");
    } else {
      todaysWork.push("Daily Brix to confirm <1°Bx before pressing/racking");
      todaysWork.push("Taste sample — confirm sugars consumed");
      decisionDue = isWhite || isRose
        ? "Dryness window — rack off gross lees + add SO₂ once <1°Bx (whites don't need press here)"
        : "Press window open — confirm dryness + bench taste before pressing";
    }
  } else if (stage === "pressed") {
    trajectory = `Pressed ${daysInStage}d ago · awaiting MLF inoculation`;
    if (daysInStage > 3) {
      status = "watch";
      decisionDue = "MLF inoculation overdue — inoculate ML bacteria or co-inoculate if not done";
      todaysWork.push("Inoculate MLF (Oenococcus oeni) per the MLF SOP");
    } else {
      todaysWork.push("Allow 24–48h settle before MLF inoculation");
      todaysWork.push("Check temperature (target 18–22°C for MLF)");
    }
  } else if (stage === "mlf_active") {
    trajectory = `MLF in progress · day ${daysInStage}${isWhite ? " · (optional for whites)" : ""}`;
    todaysWork.push("Weekly malic acid measurement (paper chromatography or enzymatic)");
    todaysWork.push(`Hold temperature ${isWhite ? "16–20°C" : "18–22°C"} — no SO₂ until complete`);
    if (daysInStage > 42) {
      status = "watch";
      decisionDue = "MLF stalled (>6 weeks) — investigate temperature/nutrient/pH";
    } else if (daysInStage > 21) {
      decisionDue = "MLF likely completing — test malic acid (<0.3 g/L = complete)";
    }
  } else if (stage === "aging_tank" || stage === "aging_barrel") {
    trajectory = `${stage === "aging_barrel" ? "Barrel" : "Tank"} ageing · day ${daysInStage}`;
    const lastSo2 = events
      .filter((e) => e.eventType === "addition" && /so.?2|sulphit|kms|metabisul/i.test(String(parseDetails(e).productName ?? "") + " " + (e.noteText ?? "")))
      .sort((a, b) => b.entryAt - a.entryAt)[0];
    const daysSinceSo2 = lastSo2 ? Math.floor((Date.now() - lastSo2.entryAt) / ONE_DAY_MS) : null;
    if (stage === "aging_barrel") {
      const lastTopup = events
        .filter((e) => /top.?up|top off|topup|ullage/i.test((e.noteText ?? "") + " " + String(parseDetails(e).what ?? "")))
        .sort((a, b) => b.entryAt - a.entryAt)[0];
      const daysSinceTopup = lastTopup ? Math.floor((Date.now() - lastTopup.entryAt) / ONE_DAY_MS) : null;
      if (daysSinceTopup === null || daysSinceTopup > 14) {
        status = daysSinceTopup === null || daysSinceTopup > 21 ? "attention" : "watch";
        todaysWork.push(`Barrel top-up ${daysSinceTopup === null ? "needed (no record on file)" : `overdue (${daysSinceTopup} days)`}`);
        decisionDue = `Top-up this week to prevent oxidation${isWhite ? "" : " + brett risk"}`;
      } else {
        todaysWork.push(`Next top-up due in ${Math.max(1, 14 - daysSinceTopup)} days`);
      }
    } else if (isWhite && stage === "aging_tank" && daysInStage < 60) {
      todaysWork.push("Bâtonnage weekly if doing fine-lees ageing (Chardonnay-style)");
    }
    if (daysSinceSo2 === null || daysSinceSo2 > (isWhite ? 60 : 90)) {
      if (status !== "attention") status = "watch";
      todaysWork.push(`Free SO₂ check overdue (${daysSinceSo2 ?? "no record"}) — measure + adjust to ${isWhite ? "35–45" : "30–40"} ppm free`);
    } else {
      todaysWork.push(`Free SO₂ measurement due in ${Math.max(1, (isWhite ? 60 : 90) - daysSinceSo2)} days`);
    }
    todaysWork.push("Monthly tasting sample (taste + visual + nose)");
    if (isWhite && daysInStage > 60) {
      todaysWork.push("Plan cold stabilisation (−4°C × 7–14 days) before bottling");
    }
  } else if (stage === "bottled") {
    trajectory = `Bottled ${daysInStage}d ago — library/QA stage`;
    todaysWork.push("Library bottle storage check");
  } else {
    trajectory = "No recent activity — first measurement will classify stage";
    todaysWork.push("Take initial Brix + temperature reading");
  }

  return {
    vesselId,
    vesselType,
    variety,
    stage,
    stageLabel: STAGE_LABELS[stage],
    daysInStage,
    status,
    trajectory,
    todaysWork,
    decisionDue,
    grounding,
    ghostQuestion: pickGhostQuestion(vesselId, stage, color, wbsCache),
  };
}

// ─── Executive summary (single LLM call) ──────────────────────────────────────

async function buildExecSummary(cards: CellarBriefCard[], trigger: string): Promise<string> {
  // 1-shot: ask the LLM to write 2 sentences. Falls back to rule-based
  // summary on error so the brief still ships even if the LLM is offline.
  const attentionCards = cards.filter((c) => c.status === "attention");
  const watchCards = cards.filter((c) => c.status === "watch");
  const decisionCards = cards.filter((c) => c.decisionDue);

  // Fallback (also used if EMERGENT_LLM_KEY missing).
  const ruleBased = (() => {
    if (cards.length === 0) return "No active vessels — nothing scheduled.";
    const parts: string[] = [];
    if (attentionCards.length > 0) {
      parts.push(`${attentionCards.length} vessel${attentionCards.length === 1 ? "" : "s"} need attention (${attentionCards.map((c) => c.vesselId).join(", ")})`);
    } else if (watchCards.length > 0) {
      parts.push(`${watchCards.length} vessel${watchCards.length === 1 ? "" : "s"} to watch`);
    } else {
      parts.push(`All ${cards.length} active vessel${cards.length === 1 ? "" : "s"} tracking healthy`);
    }
    if (decisionCards.length > 0) {
      parts.push(`${decisionCards.length} decision${decisionCards.length === 1 ? "" : "s"} due today`);
    } else {
      parts.push("No urgent decisions");
    }
    return parts.join(". ") + ".";
  })();

  const key = process.env.EMERGENT_LLM_KEY;
  if (!key) return ruleBased;

  try {
    const bullets = cards.map((c) =>
      `- ${c.vesselId} (${c.variety}) · ${c.stageLabel} day ${c.daysInStage} · ${c.status.toUpperCase()} · ${c.trajectory}${c.decisionDue ? ` · DECISION: ${c.decisionDue}` : ""}`
    ).join("\n");
    const prompt = `You write a 2-sentence executive summary for a boutique winery's ${trigger} cellar brief. Be specific (name the tanks), action-oriented, and calm — this is a daily working tool, not a press release.\n\nVessels:\n${bullets}\n\nWrite the 2-sentence summary now (no preamble, no headings):`;
    const resp = await fetch("https://integrations.emergentagent.com/llm/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5.4-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 160,
      }),
    });
    if (!resp.ok) return ruleBased;
    const j = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = j.choices?.[0]?.message?.content?.trim();
    return text && text.length > 10 && text.length < 500 ? text : ruleBased;
  } catch {
    return ruleBased;
  }
}

// ─── Public entry point ───────────────────────────────────────────────────────

/**
 * Generate a Cellar Brief for a single winery. Groups vessels by tank_name +
 * variety from the last 60 days of log entries, classifies each, builds a
 * card. Persists the result to cellar_briefs and returns it.
 *
 * trigger: 'morning' | 'evening' | 'weekly' | 'manual'
 */
export async function generateCellarBrief(
  wineryId: number,
  trigger: "morning" | "evening" | "weekly" | "manual" = "manual",
): Promise<{ id: number; summary: CellarBriefSummary }> {
  const since = Date.now() - 90 * ONE_DAY_MS;
  // Pull the last 90 days of events for this winery. Phase 2 isolation
  // means this query is naturally winery-scoped.
  const events = await db
    .select()
    .from(schema.vintageLogEntries)
    .where(and(
      eq(schema.vintageLogEntries.wineryId, wineryId),
      gte(schema.vintageLogEntries.entryAt, since),
    ))
    .orderBy(desc(schema.vintageLogEntries.entryAt));

  // Group by (tankName, variety) — one card per unique vessel.
  const groups = new Map<string, { tankName: string; variety: string; events: LogEntry[] }>();
  for (const e of events) {
    const key = `${e.tankName}::${e.variety}`;
    let g = groups.get(key);
    if (!g) {
      g = { tankName: e.tankName, variety: e.variety, events: [] };
      groups.set(key, g);
    }
    g.events.push(e);
  }

  const cards: CellarBriefCard[] = [];
  const wbsCache = await buildWbsCache();
  for (const g of Array.from(groups.values())) {
    const color = inferWineColor(g.variety);
    const stageInfo = classifyStage(g.events, color);
    // Hide bottled vessels older than 30d (library stage — not actionable)
    if (stageInfo.stage === "bottled") {
      const daysAgo = (Date.now() - stageInfo.stageStartAt) / ONE_DAY_MS;
      if (daysAgo > 30) continue;
    }
    const vesselType: "tank" | "barrel" = /barrel|hogshead|puncheon|^hbd|^fb/i.test(g.tankName) ? "barrel" : "tank";
    cards.push(buildCard(g.tankName, vesselType, g.variety, color, g.events, stageInfo, wbsCache));
  }

  // Sort by status (attention first), then by vessel id
  const statusOrder: Record<CellarBriefStatus, number> = { attention: 0, watch: 1, ok: 2 };
  cards.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    return a.vesselId.localeCompare(b.vesselId);
  });

  const execSummary = await buildExecSummary(cards, trigger);
  const summary: CellarBriefSummary = {
    execSummary,
    attentionCount: cards.filter((c) => c.status === "attention").length,
    decisionsDueCount: cards.filter((c) => c.decisionDue).length,
    tankCount: cards.length,
    cards,
  };

  // Persist
  const result = await db.insert(schema.cellarBriefs).values({
    wineryId,
    trigger,
    attentionCount: summary.attentionCount,
    decisionsDueCount: summary.decisionsDueCount,
    tankCount: summary.tankCount,
    summaryJson: JSON.stringify(summary),
    execSummary: summary.execSummary.slice(0, 511),
    generatedAt: Date.now(),
  });
  // mysql2 returns [ResultSetHeader, FieldPacket[]] sometimes; normalise.
  const resultAny = result as unknown as { insertId?: number } | Array<{ insertId?: number }>;
  const id = Array.isArray(resultAny)
    ? (resultAny[0]?.insertId ?? 0)
    : (resultAny.insertId ?? 0);
  return { id, summary };
}
