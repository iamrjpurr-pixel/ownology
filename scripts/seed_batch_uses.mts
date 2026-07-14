import { db, listCellarEquipment, logEquipmentUse } from "../server/db.js";
import * as schema from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

const [owner] = await db.select().from(schema.users).where(eq(schema.users.openId, "seed-owner-001")).limit(1);
const eq_rows = await listCellarEquipment(owner.id, owner.wineryId ?? null);
console.log("Equipment count:", eq_rows.length);
if (eq_rows.length < 3) { console.log("Not enough equipment. Aborting."); process.exit(0); }
// Pick 3 vessels of varied types
const receival = eq_rows.find(e => e.equipmentType === "hopper" || e.equipmentType === "sorting_table") ?? eq_rows[0];
const ferment = eq_rows.find(e => e.equipmentType === "fermentation_tank") ?? eq_rows[1];
const storage = eq_rows.find(e => e.equipmentType === "storage_tank" || e.equipmentType === "barrel") ?? eq_rows[2];
const now = Date.now();
const day = 24*3600*1000;

const events = [
  { equipmentId: receival.id, name: receival.name, phase: "receival" as const, direction: "in" as const, usedAt: now - 30*day, notes: "Shiraz intake 8.4t" },
  { equipmentId: receival.id, name: receival.name, phase: "receival" as const, direction: "out" as const, usedAt: now - 30*day + 3600000, notes: "Empty; rinse cycle logged" },
  { equipmentId: ferment.id, name: ferment.name, phase: "fermentation" as const, direction: "in" as const, usedAt: now - 29*day, notes: "Ferment start, 6,000L" },
  { equipmentId: ferment.id, name: ferment.name, phase: "fermentation" as const, direction: "out" as const, usedAt: now - 20*day, notes: "Post-ferment rack-off" },
  { equipmentId: storage.id, name: storage.name, phase: "storage_ageing" as const, direction: "in" as const, usedAt: now - 20*day + 7200000, notes: "MLF phase" },
];

for (const e of events) {
  const r = await logEquipmentUse({
    userId: owner.id,
    wineryId: owner.wineryId ?? null,
    batchId: 1,
    batchLabel: "26SHZ-001",
    equipmentId: e.equipmentId,
    equipmentName: e.name,
    phase: e.phase,
    direction: e.direction,
    usedAt: e.usedAt,
    notes: e.notes,
  });
  console.log(`Logged use id=${r.id} ${e.name} ${e.phase}/${e.direction} sanitOk=${r.sanitiseOkAtUse}`);
}
process.exit(0);
