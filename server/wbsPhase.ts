/**
 * wbsPhase.ts — canonical mapping of equipment type → WBS phase.
 *
 * Sourced from AWRI Practices Survey 2019, Iland & Boulton "Winemaking
 * Operations", and SafeWork NSW Winery Guide. All three collapse the
 * cellar toolchain into the same six phases; we add "other" as a
 * fallback bin.
 *
 * The mapping is used to:
 *   1. Auto-fill cellar_equipment.wbs_phase when the operator adds new
 *      kit but forgets to pick a phase.
 *   2. Group /admin/cellar-board columns by phase.
 *   3. Pre-select the phase when logging a batch equipment-use event.
 */

export type WbsPhase =
  | "receival"
  | "crushing"
  | "fermentation"
  | "pressing_transfer"
  | "storage_ageing"
  | "bottling"
  | "other";

export const WBS_PHASE_ORDER: WbsPhase[] = [
  "receival",
  "crushing",
  "fermentation",
  "pressing_transfer",
  "storage_ageing",
  "bottling",
  "other",
];

export const WBS_PHASE_LABEL: Record<WbsPhase, string> = {
  receival: "1. Receival",
  crushing: "2. Crushing",
  fermentation: "3. Fermentation",
  pressing_transfer: "4. Pressing & Transfer",
  storage_ageing: "5. Storage & Ageing",
  bottling: "6. Bottling",
  other: "Other",
};

export type EquipmentTypeKey =
  | "hopper"
  | "sorting_table"
  | "scale"
  | "destemmer"
  | "fermentation_tank"
  | "cold_room"
  | "punch_down_rig"
  | "press"
  | "pump"
  | "hose"
  | "racking_cane"
  | "storage_tank"
  | "barrel"
  | "carboy"
  | "filter"
  | "bottling_filler"
  | "corker"
  | "labeller"
  | "other";

export const EQUIPMENT_TYPE_TO_PHASE: Record<EquipmentTypeKey, WbsPhase> = {
  hopper: "receival",
  sorting_table: "receival",
  scale: "receival",
  destemmer: "crushing",
  fermentation_tank: "fermentation",
  cold_room: "fermentation",
  punch_down_rig: "fermentation",
  press: "pressing_transfer",
  pump: "pressing_transfer",
  hose: "pressing_transfer",
  racking_cane: "pressing_transfer",
  storage_tank: "storage_ageing",
  barrel: "storage_ageing",
  carboy: "storage_ageing",
  filter: "storage_ageing",
  bottling_filler: "bottling",
  corker: "bottling",
  labeller: "bottling",
  other: "other",
};

export function inferPhase(equipmentType: string): WbsPhase {
  return (EQUIPMENT_TYPE_TO_PHASE as Record<string, WbsPhase>)[equipmentType] || "other";
}

export const EQUIPMENT_TYPE_LABEL: Record<EquipmentTypeKey, string> = {
  hopper: "Hopper / receival bin",
  sorting_table: "Sorting table",
  scale: "Scale / weighbridge",
  destemmer: "Destemmer-crusher",
  fermentation_tank: "Fermenter",
  cold_room: "Cold room",
  punch_down_rig: "Punch-down / pump-over rig",
  press: "Press",
  pump: "Transfer pump",
  hose: "Hose",
  racking_cane: "Racking cane / siphon",
  storage_tank: "Storage tank",
  barrel: "Barrel",
  carboy: "Carboy / demijohn",
  filter: "Filter",
  bottling_filler: "Bottling filler",
  corker: "Corker / capper",
  labeller: "Labeller",
  other: "Other",
};

// ─── RAG State ────────────────────────────────────────────────────────
// Computed on read from event log — never stored, so no drift.

export type VesselRagState = "green" | "amber" | "red" | "grey";

export const RAG_LABEL: Record<VesselRagState, string> = {
  green: "Ready",
  amber: "Needs clean",
  red: "In use",
  grey: "Out of service",
};

export const RAG_COLOR: Record<VesselRagState, string> = {
  green: "#4a7c47",
  amber: "#b57e14",
  red: "#b91c1c",
  grey: "#6b7280",
};

/**
 * Default sanitation freshness window. 72h matches AWRI's post-clean
 * protective-atmosphere guidance for stainless vessels — cleaned and
 * held under inert gas, a vessel remains audit-safe for 3 days before
 * requiring re-sanitation. Configurable per winery in future via
 * winery_settings.sanitation_freshness_hours.
 */
export const DEFAULT_SANITATION_FRESHNESS_HOURS = 72;
