import { db } from "../server/db.js";
import * as schema from "../drizzle/schema.js";
import { sql } from "drizzle-orm";
const rows = await db.execute(sql`SELECT batch_id, COUNT(*) AS n FROM batch_equipment_uses GROUP BY batch_id ORDER BY n DESC LIMIT 5`);
console.log(rows);
process.exit(0);
