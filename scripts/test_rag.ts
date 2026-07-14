// Smoke test: exercise the RAG state machine end-to-end.
// Run from /app: npx tsx scripts/test_rag.ts
import { db, getVesselStatus, logEquipmentUse } from "../server/db.js";
import * as schema from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

const USER_ID = 1;
const EQ_ID = 1;

const pre = await getVesselStatus(EQ_ID, USER_ID);
console.log("PRE:            ", pre.state, "-", pre.reason);

const now = Date.now();
const insertRes = await db.insert(schema.cellarTasks).values({
  userId: USER_ID,
  wineryId: 1,
  equipmentId: EQ_ID,
  equipmentName: "Tank 1",
  taskType: "sanitise" as const,
  title: "Test sanitise (smoke)",
  frequency: "After use",
  completedAt: now,
  completedBy: "smoke-test",
  aiGenerated: 0,
  createdAt: now,
  updatedAt: now,
});
const taskId = (insertRes as unknown as { insertId: number }).insertId;
console.log("Inserted sanitise task id:", taskId);

const postSanitise = await getVesselStatus(EQ_ID, USER_ID);
console.log("POST-SANITISE:  ", postSanitise.state, "-", postSanitise.reason);

const useIn = await logEquipmentUse({
  userId: USER_ID,
  wineryId: 1,
  batchId: 999,
  batchLabel: "SMOKE-01",
  equipmentId: EQ_ID,
  equipmentName: "Tank 1",
  phase: "fermentation",
  direction: "in",
});
console.log("logEquipmentUse in:", useIn);

const inUse = await getVesselStatus(EQ_ID, USER_ID);
console.log("POST-FILL:      ", inUse.state, "-", inUse.reason);

await logEquipmentUse({
  userId: USER_ID,
  wineryId: 1,
  batchId: 999,
  batchLabel: "SMOKE-01",
  equipmentId: EQ_ID,
  equipmentName: "Tank 1",
  phase: "fermentation",
  direction: "out",
});
const emptied = await getVesselStatus(EQ_ID, USER_ID);
console.log("POST-EMPTY:     ", emptied.state, "-", emptied.reason);

// Cleanup
await db.delete(schema.batchEquipmentUses).where(eq(schema.batchEquipmentUses.batchLabel, "SMOKE-01"));
await db.delete(schema.cellarTasks).where(eq(schema.cellarTasks.id, taskId));
console.log("Cleaned up smoke rows.");
process.exit(0);
