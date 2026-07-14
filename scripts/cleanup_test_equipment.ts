// Cleanup script: remove the two "Test" cellar_equipment rows created
// while smoke-testing the /how-we-trace saveProspectIntake mutation.
// Run once with: npx tsx scripts/cleanup_test_equipment.ts
import { db } from "../server/db.js";
import * as schema from "../drizzle/schema.js";
import { eq, and, inArray } from "drizzle-orm";

const testIds = [11, 12];
const del = await db.delete(schema.cellarEquipment).where(
  and(inArray(schema.cellarEquipment.id, testIds), eq(schema.cellarEquipment.name, "Test"))
);
console.log("deleted:", del);
process.exit(0);
