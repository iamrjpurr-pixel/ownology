import { db } from "/app/server/db.js";
import * as schema from "/app/drizzle/schema.js";
import { eq } from "drizzle-orm";
const [owner] = await db.select().from(schema.users).where(eq(schema.users.openId, "seed-owner-001")).limit(1);
console.log("owner:", owner?.id, owner?.wineryId);
const batches = await db.select().from(schema.wineBatches).where(eq(schema.wineBatches.userId, owner.id)).limit(5);
console.log("batches:", batches.map(b => ({ id: b.id, batchId: b.batchId, vintage: b.vintage, variety: b.variety })));
if (batches.length > 0) {
  const uses = await db.select().from(schema.batchEquipmentUses).where(eq(schema.batchEquipmentUses.batchId, batches[0].id));
  console.log(`uses for batch ${batches[0].id}:`, uses.length);
}
process.exit(0);
