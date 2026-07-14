/**
 * prospectCellar.ts — turn a 5-minute intake into a personalised RAG
 * board on /how-we-trace.
 *
 * The public "See it on your own kit" flow doesn't touch the database.
 * Intake lives in localStorage (single row, latest wins) so:
 *   - Anonymous prospects can try it without signup.
 *   - Refresh preserves their personalised board.
 *   - Rich never has to garbage-collect abandoned intake rows.
 *
 * If we later want a shareable link, add a POST endpoint that stores the
 * same JSON under a UUID token — schema shape here is future-proof for
 * that (see ProspectIntake).
 */

export type WbsPhase =
  | "receival"
  | "crushing"
  | "fermentation"
  | "pressing_transfer"
  | "storage_ageing"
  | "bottling";

export type RagState = "green" | "amber" | "red" | "grey";

export type ProspectVessel = {
  id: number;
  name: string;
  equipmentType: string;
  wbsPhase: WbsPhase;
  capacityL?: number;
  material: string;
  state: RagState;
  reason: string;
  sanitisedAgoHours: number | null;
  currentBatch?: string;
  recentUses: Array<{
    batchLabel: string;
    phase: WbsPhase;
    direction: "in" | "out" | "pass";
    agoHours: number;
    sanitisedOk: boolean;
    sanitiseAgeHours: number | null;
  }>;
};

/** One line in the equipment intake form. */
export type IntakeEntry = {
  key: string;          // equipment type slug (e.g. "fermentation_tank")
  label: string;        // display label (e.g. "Fermenter")
  phase: WbsPhase;
  quantity: number;     // how many they own (default 1)
  capacityL?: number;   // optional per-item capacity
};

/** Full intake blob stored in localStorage. */
export type ProspectIntake = {
  version: 1;
  batchLabel: string;   // e.g. "26SHZ-001"
  wineStyle: string;    // e.g. "McLaren Vale Shiraz"
  entries: IntakeEntry[];
  savedAt: number;      // ms epoch
};

/**
 * Canonical equipment catalog for the intake form. Ordered by WBS phase.
 * Keep this list short and non-technical — the goal is a 5-minute intake,
 * not a complete equipment audit. Advanced gear (labellers, punch-down
 * rigs) is intentionally omitted from the form; prospects can request
 * them post-signup.
 */
export const EQUIPMENT_CATALOG: Array<{ key: string; label: string; phase: WbsPhase; typicalCapacityL?: number }> = [
  { key: "hopper", label: "Fruit hopper / receival bin", phase: "receival" },
  { key: "sorting_table", label: "Sorting table", phase: "receival" },
  { key: "scale", label: "Weighbridge / scale", phase: "receival" },
  { key: "destemmer", label: "Destemmer-crusher", phase: "crushing" },
  { key: "fermentation_tank", label: "Fermenter", phase: "fermentation", typicalCapacityL: 2000 },
  { key: "cold_room", label: "Cold room", phase: "fermentation" },
  { key: "press", label: "Press (basket / bladder)", phase: "pressing_transfer" },
  { key: "pump", label: "Transfer pump", phase: "pressing_transfer" },
  { key: "hose", label: "Food-grade hose", phase: "pressing_transfer" },
  { key: "racking_cane", label: "Racking cane / siphon", phase: "pressing_transfer" },
  { key: "storage_tank", label: "Storage tank", phase: "storage_ageing", typicalCapacityL: 5000 },
  { key: "barrel", label: "Oak barrel", phase: "storage_ageing", typicalCapacityL: 225 },
  { key: "carboy", label: "Carboy / demijohn", phase: "storage_ageing", typicalCapacityL: 60 },
  { key: "filter", label: "Filter", phase: "storage_ageing" },
  { key: "bottling_filler", label: "Bottling filler", phase: "bottling" },
  { key: "corker", label: "Corker / capper", phase: "bottling" },
];

const LS_KEY = "ow_prospect_cellar_v1";

export function saveProspectIntake(intake: ProspectIntake): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LS_KEY, JSON.stringify(intake));
  } catch {
    // Storage disabled or full — silently no-op; the intake stays in memory only.
  }
}

export function loadProspectIntake(): ProspectIntake | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProspectIntake;
    if (parsed?.version !== 1 || !Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearProspectIntake(): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(LS_KEY);
  } catch {
    /* no-op */
  }
}

/**
 * Deterministic PRNG seeded from the intake so re-renders don't reshuffle
 * the RAG assignment on every page mount. Same intake → same board.
 */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MATERIAL_BY_TYPE: Record<string, string> = {
  hopper: "stainless",
  sorting_table: "stainless",
  scale: "stainless",
  destemmer: "stainless",
  fermentation_tank: "stainless",
  cold_room: "stainless",
  press: "stainless",
  pump: "stainless",
  hose: "food-grade",
  racking_cane: "stainless",
  storage_tank: "stainless",
  barrel: "wood",
  carboy: "glass",
  filter: "stainless",
  bottling_filler: "stainless",
  corker: "stainless",
};

/**
 * Turn an intake into a coherent RAG-populated vessel list.
 *
 * Rules for making the board feel real without being random:
 *   - The `batchLabel` occupies exactly ONE fermenter (Red). If the
 *     prospect skipped fermenters entirely, we use their first storage
 *     tank instead. If neither → no Red vessel.
 *   - ~30% of vessels are Green (sanitised within 72h). Deterministic
 *     from the intake seed.
 *   - If they added a press, ~30% chance it's Grey (gasket fault) to
 *     show the out-of-service UX.
 *   - Everything else is Amber (needs clean).
 *   - Each vessel gets a plausible "recent use" tied to their batch
 *     label so the drawer feels populated, not empty.
 */
export function generateProspectCellar(intake: ProspectIntake): ProspectVessel[] {
  const rand = seededRandom(`${intake.batchLabel}|${intake.wineStyle}|${intake.entries.map((e) => e.key + e.quantity).join(",")}`);

  const vessels: ProspectVessel[] = [];
  let id = 1;

  // Expand each intake entry by its quantity, giving each unit a number if quantity > 1.
  for (const entry of intake.entries) {
    const catalogItem = EQUIPMENT_CATALOG.find((c) => c.key === entry.key);
    const capacity = entry.capacityL ?? catalogItem?.typicalCapacityL;
    for (let n = 1; n <= entry.quantity; n++) {
      const name = entry.quantity > 1 ? `${entry.label} #${n}` : entry.label;
      vessels.push({
        id: id++,
        name,
        equipmentType: entry.key,
        wbsPhase: entry.phase,
        capacityL: capacity,
        material: MATERIAL_BY_TYPE[entry.key] ?? "stainless",
        // placeholder; overwritten below
        state: "amber",
        reason: "Empty — clean + sanitise before next use",
        sanitisedAgoHours: null,
        recentUses: [],
      });
    }
  }

  // 1. Pick one vessel to hold the current batch (Red).
  const fermenters = vessels.filter((v) => v.equipmentType === "fermentation_tank");
  const storageTanks = vessels.filter((v) => v.equipmentType === "storage_tank");
  const holder = fermenters[0] ?? storageTanks[0] ?? null;
  if (holder) {
    holder.state = "red";
    holder.reason = `Holding batch ${intake.batchLabel} — day 1 of fermentation`;
    holder.currentBatch = intake.batchLabel;
    holder.sanitisedAgoHours = 24;
    holder.recentUses = [
      {
        batchLabel: intake.batchLabel,
        phase: holder.wbsPhase,
        direction: "in",
        agoHours: 20,
        sanitisedOk: true,
        sanitiseAgeHours: 4,
      },
    ];
  }

  // 2. Optional Grey — press with a gasket fault (~30% chance if a press exists).
  const presses = vessels.filter((v) => v.equipmentType === "press");
  if (presses.length > 0 && rand() < 0.35) {
    const p = presses[Math.floor(rand() * presses.length)];
    p.state = "grey";
    p.reason = "Gasket fault — awaiting seal replacement";
    p.sanitisedAgoHours = null;
  }

  // 3. Sprinkle ~30% Green (sanitised, empty, within 72h freshness).
  const remaining = vessels.filter((v) => v.state === "amber");
  const greenTargetCount = Math.max(1, Math.floor(remaining.length * 0.3));
  // Shuffle remaining using seeded rand
  const shuffled = [...remaining].sort(() => rand() - 0.5);
  for (const v of shuffled.slice(0, greenTargetCount)) {
    const ago = Math.floor(rand() * 12) + 1;
    v.state = "green";
    v.reason = `Sanitised — ${72 - ago}h freshness remaining`;
    v.sanitisedAgoHours = ago;
  }

  // 4. For each still-amber vessel, populate the reason with a variant.
  const amberReasons = [
    "Used since last sanitation — clean + sanitise before next use",
    "Sanitation window expired — re-sanitise before next use",
    "Never sanitised — clean + sanitise before next use",
  ];
  for (const v of vessels) {
    if (v.state !== "amber") continue;
    const reasonIdx = Math.floor(rand() * amberReasons.length);
    v.reason = amberReasons[reasonIdx];
    if (reasonIdx === 0) v.sanitisedAgoHours = Math.floor(rand() * 24) + 24;
    else if (reasonIdx === 1) v.sanitisedAgoHours = Math.floor(rand() * 24) + 96;
    else v.sanitisedAgoHours = null;
  }

  // 5. Give any vessel on the batch's likely flow-path a plausible recentUse tie-in
  // so the drawer story lands: hopper → sorting table → destemmer → pump/hose → holder.
  const flowPathTypes: Array<{ type: string; phase: WbsPhase; agoHours: number }> = [
    { type: "hopper", phase: "receival", agoHours: 22 },
    { type: "sorting_table", phase: "receival", agoHours: 22 },
    { type: "destemmer", phase: "crushing", agoHours: 21 },
    { type: "pump", phase: "pressing_transfer", agoHours: 20 },
    { type: "hose", phase: "pressing_transfer", agoHours: 20 },
  ];
  for (const step of flowPathTypes) {
    const match = vessels.find((v) => v.equipmentType === step.type);
    if (!match) continue;
    match.recentUses = [
      {
        batchLabel: intake.batchLabel,
        phase: step.phase,
        direction: "pass",
        agoHours: step.agoHours,
        sanitisedOk: true,
        sanitiseAgeHours: 5,
      },
    ];
  }

  return vessels;
}

/**
 * Timeline steps for the "traceability sheet" section, built from the
 * prospect's own equipment. Falls back to a generic step if a phase's
 * equipment is missing.
 */
export function generateProspectTimeline(intake: ProspectIntake) {
  const findLabel = (types: string[], fallback: string): string => {
    for (const t of types) {
      const e = intake.entries.find((x) => x.key === t);
      if (e) return e.label;
    }
    return fallback;
  };

  return [
    {
      label: "Received (22h ago)",
      equipment: findLabel(["hopper", "sorting_table"], "receival bin"),
      agoHours: 22,
      sanitisedAgoHours: 4,
      phase: "receival" as WbsPhase,
    },
    {
      label: "Destemmed (21h ago)",
      equipment: findLabel(["destemmer"], "destemmer-crusher"),
      agoHours: 21,
      sanitisedAgoHours: 5,
      phase: "crushing" as WbsPhase,
    },
    {
      label: "Must pumped (20h ago)",
      equipment: findLabel(["pump", "hose"], "transfer pump + hose"),
      agoHours: 20,
      sanitisedAgoHours: 5,
      phase: "pressing_transfer" as WbsPhase,
    },
    {
      label: "Fermentation (day 1)",
      equipment: findLabel(["fermentation_tank", "storage_tank"], "fermenter"),
      agoHours: 20,
      sanitisedAgoHours: 4,
      phase: "fermentation" as WbsPhase,
    },
  ];
}
