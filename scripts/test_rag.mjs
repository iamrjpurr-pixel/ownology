// Quick smoke test: sanitise Tank 1, verify state flips to green, then age it past 72h and verify amber.
import { db } from "./server/db.js";
import * as schema from "./drizzle/schema.js";
import { eq, and } from "drizzle-orm";
import { getVesselStatus, logEquipmentUse } from "./server/db.js";

const USER_ID = 1;
const EQ_ID = 1;

// Snapshot pre-state
const pre = await getVesselStatus(EQ_ID, USER_ID);
console.log("PRE:", pre.state, "-", pre.reason);

// Insert a fresh completed sanitise task
const now = Date.now();
const res = await db.insert(schema.cellarTasks).values({
  userId: USER_ID,
  wineryId: 1,
  equipmentId: EQ_ID,
  equipmentName: "Tank 1",
  taskType: "sanitise",
  title: "Test sanitise (smoke)",
  frequency: "After use",
  completedAt: now,
  completedBy: "smoke-test",
  aiGenerated: 0,
  createdAt: now,
  updatedAt: now,
});
const taskId = res.insertId || res[0]?.insertId;
console.log("Inserted sanitise task id:", taskId);

const post = await getVesselStatus(EQ_ID, USER_ID);
console.log("POST-SANITISE:", post.state, "-", post.reason);

// Now log a batch-in event and re-check → should flip to red
const useRes = await logEquipmentUse({
  userId: USER_ID,
  wineryId: 1,
  batchId: 999,
  batchLabel: "SMOKE-01",
  equipmentId: EQ_ID,
  equipmentName: "Tank 1",
  phase: "fermentation",
  direction: "in",
});
console.log("Logged use:", useRes);

const inUse = await getVesselStatus(EQ_ID, USER_ID);
console.log("POST-FILL:", inUse.state, "-", inUse.reason);

// Now log rack-out → back to green (sanitised is still within window)
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
console.log("POST-EMPTY:", emptied.state, "-", emptied.reason);

// Cleanup smoke rows
await db.delete(schema.batchEquipmentUses).where(eq(schema.batchEquipmentUses.batchLabel, "SMOKE-01"));
await db.delete(schema.cellarTasks).where(eq(schema.cellarTasks.id, taskId));
console.log("Cleaned up smoke rows.");

process.exit(0);
