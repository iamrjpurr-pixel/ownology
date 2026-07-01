/**
 * lipCompliance.ts — shared 85% blend-disclosure logic
 *
 * Extracted from `lipAuditPackPdf.ts` so the same math powers:
 *   1. The LIP Audit Pack PDF (annual regulator export)
 *   2. The live compliance badge on the Cellar Brief (daily ambient signal)
 *   3. Anything future — CSV exports, dashboard widgets, alerts.
 *
 * Reference: Wine Australia Act 2013 s.39F — a label claim of a vintage /
 * variety / GI requires ≥ 85% of the finished wine to originate from that
 * class. We weight per intake (kg), normalising tonnes → kg for wineries
 * that log by the tonne. Bulk juice / wine received in litres is excluded
 * from the kg-weighted classification since it has no fruit-intake weight.
 */
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { and, eq } from "drizzle-orm";

export const LIP_THRESHOLD = 0.85;

export type LipComplianceStatus = "pass" | "watch" | "attention" | "empty";

export type LipClass = {
  variety: string;
  gi: string;
  kg: number;
  batches: number;
  litres: number;
  share: number;       // 0.0 – 1.0, share of vintage intake
  pass: boolean;       // share >= 85% OR is the vintage's only class
};

export type LipCompliance = {
  vintage: number;
  status: LipComplianceStatus;
  batchCount: number;
  classCount: number;
  totalKg: number;
  totalLitres: number;
  classes: LipClass[];          // sorted by share desc
  worstClass: LipClass | null;  // the largest class that still fails 85%
  passingClasses: number;
  failingClasses: number;
  /**
   * Short human-readable nudge, ~100 chars. Actionable when possible
   * ("340L short of 85% threshold"), grey when the vintage is a designed
   * blend with no near-miss.
   */
  nudge: string;
};

/**
 * Runs the 85% rule against a winery's wine_batches for one vintage year.
 * Winery-scoped (respects tenancy) — pass the winery's id.
 */
export async function computeLipCompliance(
  wineryId: number,
  vintage: number,
): Promise<LipCompliance> {
  const batches = await db.select().from(schema.wineBatches).where(
    and(
      eq(schema.wineBatches.wineryId, wineryId),
      eq(schema.wineBatches.vintage, vintage),
    )
  );

  return computeLipComplianceFromBatches(vintage, batches);
}

/**
 * Pure function variant — no DB read. Used by the LIP PDF, which already
 * has the batch list in hand (its `owner.userId`-scoped query is
 * different from the winery-scoped one used by the badge).
 */
export function computeLipComplianceFromBatches(
  vintage: number,
  batches: Array<typeof schema.wineBatches.$inferSelect>,
): LipCompliance {
  if (batches.length === 0) {
    return {
      vintage,
      status: "empty",
      batchCount: 0,
      classCount: 0,
      totalKg: 0,
      totalLitres: 0,
      classes: [],
      worstClass: null,
      passingClasses: 0,
      failingClasses: 0,
      nudge: `No batches logged for vintage ${vintage} yet.`,
    };
  }

  type Row = { variety: string; gi: string; kg: number; batches: number; litres: number };
  const byClass = new Map<string, Row>();
  let totalKg = 0;
  let totalLitres = 0;

  for (const b of batches) {
    const qtyRaw = Number(b.quantityValue ?? 0);
    // Bulk juice/wine received by volume — track litres but skip the
    // kg-weighted classification since there's no fruit-intake weight.
    if (b.quantityUnit === "L") {
      totalLitres += qtyRaw;
      const key = `${b.variety}||${b.gi || "—"}`;
      const cur = byClass.get(key) ?? { variety: b.variety, gi: b.gi || "—", kg: 0, batches: 0, litres: 0 };
      cur.batches += 1;
      cur.litres += qtyRaw;
      byClass.set(key, cur);
      continue;
    }
    const kg = b.quantityUnit === "t" ? qtyRaw * 1000 : qtyRaw;
    totalKg += kg;
    const l = b.currentVolumeLitres ?? b.volumeLitres ?? 0;
    totalLitres += l;
    const key = `${b.variety}||${b.gi || "—"}`;
    const cur = byClass.get(key) ?? { variety: b.variety, gi: b.gi || "—", kg: 0, batches: 0, litres: 0 };
    cur.kg += kg;
    cur.batches += 1;
    cur.litres += l;
    byClass.set(key, cur);
  }

  const classes: LipClass[] = Array.from(byClass.values())
    .map((c) => {
      const share = totalKg > 0 ? c.kg / totalKg : (c.litres > 0 && totalLitres > 0 ? c.litres / totalLitres : 0);
      // A vintage's single class always passes (100% of itself).
      const pass = share >= LIP_THRESHOLD || byClass.size === 1;
      return { ...c, share, pass };
    })
    .sort((a, b) => b.share - a.share);

  const passingClasses = classes.filter((c) => c.pass).length;
  const failingClasses = classes.length - passingClasses;
  const worstClass = classes.find((c) => !c.pass) ?? null; // largest failing class

  // Status derivation:
  //   pass       — every class meets 85%, or it's a single-class vintage
  //   watch      — largest failing class is within 5 percentage-points of threshold
  //                (near-miss — a small consolidation could clear it)
  //   attention  — largest failing class is > 5 pp below threshold, or many
  //                classes are failing — this vintage is a designed blend
  let status: LipComplianceStatus;
  if (failingClasses === 0) status = "pass";
  else if (worstClass && worstClass.share >= LIP_THRESHOLD - 0.05) status = "watch";
  else status = "attention";

  const nudge = buildNudge(vintage, status, classes, worstClass, totalKg);

  return {
    vintage,
    status,
    batchCount: batches.length,
    classCount: classes.length,
    totalKg,
    totalLitres,
    classes,
    worstClass,
    passingClasses,
    failingClasses,
    nudge,
  };
}

function buildNudge(
  vintage: number,
  status: LipComplianceStatus,
  classes: LipClass[],
  worst: LipClass | null,
  totalKg: number,
): string {
  if (status === "pass") {
    if (classes.length === 1) {
      const c = classes[0];
      return `Vintage ${vintage}: single-class vintage — ${c.variety} / ${c.gi} qualifies as a single-varietal label.`;
    }
    // One class dominates ≥85% of the vintage — even a vintage-wide blend
    // could still claim that single class.
    const dominant = classes[0];
    return `Vintage ${vintage}: ${dominant.variety} / ${dominant.gi} at ${(dominant.share * 100).toFixed(0)}% — a whole-vintage blend would still qualify as single-class ${dominant.variety}.`;
  }
  if (status === "watch" && worst && totalKg > 0) {
    const shortKg = Math.max(0, 0.85 * totalKg - worst.kg);
    const shortStr = shortKg >= 1000 ? `${(shortKg / 1000).toFixed(1)}t` : `${Math.round(shortKg)}kg`;
    return `${worst.variety} / ${worst.gi} at ${(worst.share * 100).toFixed(1)}% — ${shortStr} short of a single-class label claim if you blend the whole vintage.`;
  }
  if (status === "attention" && worst) {
    return `${classes.length} distinct classes this vintage. Each can bottle as its own single-varietal label. A whole-vintage blend would require blend disclosure.`;
  }
  return `Vintage ${vintage} label compliance unavailable.`;
}
